#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
dry_run=0
selected_tool="all"
parallel_jobs=2
paddle_accelerator="cpu"
paddle_cuda_index=""
paddle_cuda_label=""
paddle_driver_version=""
install_tmp_dir=""

usage() {
  cat <<'EOF'
Usage: scripts/install-tools.sh [options]

  --tool liteparse|paddleocr|chandra|all
                            Runtime to install (default: all)
  --accelerator cpu|nvidia PaddleOCR engine to install (default: cpu)
  --jobs NUMBER             Concurrent uv installs (default: 2)
  --dry-run                 Inspect and preview without installing anything
  -h, --help                Show this help

This installs user-level CLI runtimes only. It does not install agent skill
links, model weights, Pandoc, GPU drivers, or model servers.
EOF
}

require_value() {
  local option="$1" argument_count="$2"
  ((argument_count >= 2)) || {
    printf 'error: %s requires a value\n' "$option" >&2
    usage >&2
    exit 2
  }
}

while (($#)); do
  case "$1" in
    --tool) require_value "$1" "$#"; selected_tool="$2"; shift 2 ;;
    --accelerator) require_value "$1" "$#"; paddle_accelerator="$2"; shift 2 ;;
    --jobs) require_value "$1" "$#"; parallel_jobs="$2"; shift 2 ;;
    --dry-run) dry_run=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) printf 'error: unknown argument: %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

case "$selected_tool" in
  liteparse|paddleocr|chandra|all) ;;
  *)
    printf 'error: unsupported tool: %s\n' "$selected_tool" >&2
    exit 2
    ;;
esac

case "$paddle_accelerator" in
  cpu|nvidia) ;;
  *)
    printf 'error: unsupported accelerator: %s\n' "$paddle_accelerator" >&2
    exit 2
    ;;
esac

if [[ "$paddle_accelerator" != "cpu" &&
  "$selected_tool" != "paddleocr" && "$selected_tool" != "all" ]]; then
  printf '%s\n' \
    'error: --accelerator applies only when PaddleOCR is selected' >&2
  exit 2
fi

[[ "$parallel_jobs" =~ ^[1-9][0-9]*$ ]] || {
  printf 'error: --jobs must be a positive integer\n' >&2
  exit 2
}

declare -a tools=()
if [[ "$selected_tool" == "all" ]]; then
  tools=(liteparse paddleocr chandra)
else
  tools=("$selected_tool")
fi

declare -A action=()
declare -A detail=()
declare -A npm_prefix=()
declare -A uv_python=()
uv_inventory=""
uv_inventory_checked=0
uv_tools_dir=""
uv_bin_dir=""

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

working_command() {
  local command_name="$1"
  shift
  command -v "$command_name" >/dev/null 2>&1 || return 1
  "$command_name" "$@" >/dev/null 2>&1
}

version_at_least() {
  local installed="$1" required="$2" index installed_part required_part
  local -a installed_parts required_parts
  IFS=. read -r -a installed_parts <<<"$installed"
  IFS=. read -r -a required_parts <<<"$required"
  for ((index=0; index<${#required_parts[@]}; index++)); do
    installed_part="${installed_parts[$index]:-0}"
    required_part="${required_parts[$index]}"
    [[ "$installed_part" =~ ^[0-9]+$ && "$required_part" =~ ^[0-9]+$ ]] ||
      return 2
    if ((10#$installed_part > 10#$required_part)); then
      return 0
    fi
    if ((10#$installed_part < 10#$required_part)); then
      return 1
    fi
  done
  return 0
}

inspect_paddle_nvidia_host() {
  local driver_output driver_line detected_driver=""
  [[ "$paddle_accelerator" == "nvidia" ]] || return 0
  [[ "$(uname -s)" == "Linux" && "$(uname -m)" == "x86_64" ]] ||
    fail "PaddleOCR NVIDIA installation currently supports Linux x86_64 only"
  command -v nvidia-smi >/dev/null 2>&1 ||
    fail "--accelerator nvidia requires nvidia-smi and a working NVIDIA driver"
  driver_output="$(
    nvidia-smi --query-gpu=driver_version --format=csv,noheader 2>/dev/null
  )" || fail "nvidia-smi could not report the NVIDIA driver version"
  while IFS= read -r driver_line; do
    driver_line="${driver_line//[[:space:]]/}"
    [[ -n "$driver_line" ]] || continue
    [[ "$driver_line" =~ ^[0-9]+([.][0-9]+)*$ ]] ||
      fail "nvidia-smi returned an invalid driver version: $driver_line"
    if [[ -n "$detected_driver" && "$driver_line" != "$detected_driver" ]]; then
      fail "nvidia-smi reported inconsistent driver versions"
    fi
    detected_driver="$driver_line"
  done <<<"$driver_output"
  [[ -n "$detected_driver" ]] ||
    fail "nvidia-smi did not report an NVIDIA GPU driver version"

  paddle_driver_version="$detected_driver"
  if version_at_least "$detected_driver" "550.54.14"; then
    paddle_cuda_index="https://www.paddlepaddle.org.cn/packages/stable/cu126/"
    paddle_cuda_label="CUDA 12.6"
  elif version_at_least "$detected_driver" "450.80.02"; then
    paddle_cuda_index="https://www.paddlepaddle.org.cn/packages/stable/cu118/"
    paddle_cuda_label="CUDA 11.8"
  else
    fail "NVIDIA driver $detected_driver is too old for PaddlePaddle GPU; version 450.80.02 or later is required"
  fi
}

inspect_npm_prefix() {
  local prefix
  command -v npm >/dev/null 2>&1 ||
    fail "npm is required to install LiteParse"
  prefix="$(npm prefix --global 2>/dev/null)" ||
    fail "npm could not determine its global prefix"
  [[ "$prefix" == /* && "$prefix" != "/" ]] ||
    fail "npm returned an unsafe global prefix: $prefix"
  printf '%s\n' "$prefix"
}

require_supported_node() {
  local node_major node_version
  command -v node >/dev/null 2>&1 ||
    fail "Node.js 18 or later is required to install LiteParse"
  node_version="$(node -p 'process.versions.node' 2>/dev/null)" ||
    fail "Node.js could not report its version"
  node_major="${node_version%%.*}"
  [[ "$node_major" =~ ^[0-9]+$ && $node_major -ge 18 ]] ||
    fail "Node.js 18 or later is required; found $node_version"
}

supported_liteparse_version() {
  local version="$1" major minor remainder
  major="${version%%.*}"
  remainder="${version#*.}"
  minor="${remainder%%.*}"
  [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ &&
    $major -eq 2 && $minor -ge 8 ]]
}

liteparse_package_details() {
  local command_path resolved_path package_dir package_file version prefix
  command_path="$(command -v liteparse)" || return 1
  command -v readlink >/dev/null 2>&1 || return 1
  command -v node >/dev/null 2>&1 || return 1
  resolved_path="$(readlink -f "$command_path")" || return 1
  case "$resolved_path" in
    */node_modules/@llamaindex/liteparse/*) ;;
    *) return 1 ;;
  esac
  package_dir="${resolved_path%%/node_modules/@llamaindex/liteparse/*}/node_modules/@llamaindex/liteparse"
  package_file="$package_dir/package.json"
  [[ -f "$package_file" ]] || return 1
  version="$(node -p 'require(process.argv[1]).version' "$package_file" 2>/dev/null)" ||
    return 1
  prefix="${package_dir%/lib/node_modules/@llamaindex/liteparse}"
  [[ "$prefix" == /* && "$prefix" != "$package_dir" ]] || return 1
  printf '%s\t%s\n' "$version" "$prefix"
}

inspect_liteparse() {
  local major minor package_details package_file prefix remainder version
  if command -v liteparse >/dev/null 2>&1; then
    working_command liteparse --help ||
      fail "liteparse exists on PATH but does not run successfully"
    if package_details="$(liteparse_package_details)"; then
      IFS=$'\t' read -r version prefix <<<"$package_details"
      npm_prefix[liteparse]="$prefix"
      if supported_liteparse_version "$version"; then
        action[liteparse]="skip"
        detail[liteparse]="LiteParse $version is available at $(command -v liteparse)"
      else
        major="${version%%.*}"
        remainder="${version#*.}"
        minor="${remainder%%.*}"
        if [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ &&
          ( $major -lt 2 || ( $major -eq 2 && $minor -lt 8 ) ) ]]; then
          require_supported_node
          action[liteparse]="upgrade"
          detail[liteparse]="replace unsupported LiteParse $version with the supported 2.x release"
        else
          fail "unsupported LiteParse version: $version; expected 2.8 or later in the 2.x line"
        fi
      fi
    else
      action[liteparse]="skip"
      detail[liteparse]="LiteParse is available at $(command -v liteparse); package ownership is external or unknown"
    fi
    return
  fi

  require_supported_node
  prefix="$(inspect_npm_prefix)"
  package_file="$prefix/lib/node_modules/@llamaindex/liteparse/package.json"
  if [[ -f "$package_file" ]]; then
    fail "@llamaindex/liteparse is installed under $prefix but liteparse is not on PATH"
  fi
  action[liteparse]="install"
  detail[liteparse]="npm global prefix: $prefix"
  npm_prefix[liteparse]="$prefix"
}

load_uv_inventory() {
  if [[ $uv_inventory_checked -eq 1 ]]; then
    return
  fi
  command -v uv >/dev/null 2>&1 ||
    fail "uv is required to install PaddleOCR and Chandra"
  uv_inventory="$(uv tool list 2>/dev/null)" ||
    fail "uv could not inspect installed tools"
  uv_tools_dir="$(uv tool dir 2>/dev/null)" ||
    fail "uv could not determine its tool directory"
  uv_bin_dir="$(uv tool dir --bin 2>/dev/null)" ||
    fail "uv could not determine its tool executable directory"
  [[ "$uv_tools_dir" == /* && "$uv_tools_dir" != "/" ]] ||
    fail "uv returned an unsafe tool directory: $uv_tools_dir"
  [[ "$uv_bin_dir" == /* && "$uv_bin_dir" != "/" ]] ||
    fail "uv returned an unsafe tool executable directory: $uv_bin_dir"
  uv_inventory_checked=1
}

uv_package_exists() {
  local package_name="$1"
  grep -Eq "^${package_name} v[^[:space:]]+" <<<"$uv_inventory"
}

require_uv_bin_on_path() {
  case ":${PATH:-}:" in
    *":$uv_bin_dir:"*) return ;;
  esac
  fail "uv's tool executable directory is not on PATH: $uv_bin_dir; run 'uv tool update-shell' explicitly if appropriate"
}

inspect_uv_tool() {
  local tool_name="$1" command_name="$2" package_name="$3"
  shift 3
  if command -v "$command_name" >/dev/null 2>&1; then
    working_command "$command_name" "$@" ||
      fail "$command_name exists on PATH but does not run successfully"
    action["$tool_name"]="skip"
    detail["$tool_name"]="$command_name is available at $(command -v "$command_name")"
    return
  fi

  load_uv_inventory
  if uv_package_exists "$package_name"; then
    fail "$package_name is installed as a uv tool but $command_name is not on PATH; run 'uv tool update-shell' explicitly if appropriate"
  fi
  require_uv_bin_on_path
  action["$tool_name"]="install"
  detail["$tool_name"]="isolated uv tool environment using Python 3.12"
}

uv_tool_python_path() {
  local package_name="$1" command_name="$2"
  local command_path expected_path resolved_path
  command -v uv >/dev/null 2>&1 || return 1
  command_path="$(command -v "$command_name")" || return 1
  command -v readlink >/dev/null 2>&1 || return 1
  load_uv_inventory
  expected_path="$uv_tools_dir/$package_name/bin/$command_name"
  resolved_path="$(readlink -f "$command_path")" || return 1
  [[ "$resolved_path" == "$(readlink -f "$expected_path" 2>/dev/null)" ]] ||
    return 1
  printf '%s/python\n' "${expected_path%/"$command_name"}"
}

inspect_paddleocr_export_support() {
  local cuda_details cuda_status device_count max_memory_mib python_path
  local gpu_summary
  if [[ "${action[paddleocr]}" != "skip" ]]; then
    if [[ "$paddle_accelerator" == "nvidia" ]]; then
      detail[paddleocr]="$paddle_cuda_label NVIDIA engine for driver $paddle_driver_version in an isolated uv tool environment"
    fi
    return 0
  fi
  if ! python_path="$(uv_tool_python_path paddleocr paddleocr)"; then
    if [[ "$paddle_accelerator" == "nvidia" ]]; then
      fail "--accelerator nvidia requires PaddleOCR to be managed by uv"
    fi
    return 0
  fi
  uv_python[paddleocr]="$python_path"
  [[ -x "$python_path" ]] ||
    fail "PaddleOCR's uv environment has no usable Python interpreter"
  if ! "$python_path" -c 'import paddle' >/dev/null 2>&1; then
    if [[ "$paddle_accelerator" == "nvidia" ]]; then
      load_uv_inventory
      uv_package_exists paddleocr ||
        fail "PaddleOCR is not uv-managed and cannot be reconfigured safely"
      action[paddleocr]="reconfigure"
      detail[paddleocr]="restore its missing engine with the $paddle_cuda_label NVIDIA engine for driver $paddle_driver_version"
      return 0
    fi
    fail "PaddleOCR's uv environment cannot import a PaddlePaddle engine; install the hardware-compatible engine explicitly"
  fi

  if [[ "$paddle_accelerator" == "nvidia" ]]; then
    if cuda_details="$(
      "$python_path" "$script_dir/check_paddle_cuda.py" 2>/dev/null
    )"; then
      IFS=$'\t' read -r device_count max_memory_mib gpu_summary \
        <<<"$cuda_details"
      detail[paddleocr]="PaddleOCR CUDA is available: $gpu_summary"
    else
      cuda_status=$?
      if [[ $cuda_status -eq 1 ]]; then
        load_uv_inventory
        uv_package_exists paddleocr ||
          fail "PaddleOCR is not uv-managed and cannot be reconfigured safely"
        action[paddleocr]="reconfigure"
        detail[paddleocr]="replace its CPU engine with the $paddle_cuda_label NVIDIA engine for driver $paddle_driver_version"
      elif [[ $cuda_status -eq 3 ]]; then
        fail "PaddleOCR-VL requires NVIDIA GPU 0 compute capability 7.0 or later"
      elif [[ $cuda_status -eq 4 ]]; then
        fail "PaddleOCR's CUDA build has no visible NVIDIA devices; check CUDA_VISIBLE_DEVICES and driver/runtime visibility without reinstalling"
      else
        fail "PaddleOCR's CUDA runtime check failed"
      fi
    fi
  fi

  if "$python_path" -c 'import docx' >/dev/null 2>&1; then
    return
  fi
  load_uv_inventory
  uv_package_exists paddleocr ||
    fail "PaddleOCR is missing python-docx, but its package ownership is unknown"
  if [[ "${action[paddleocr]}" != "reconfigure" ]]; then
    action[paddleocr]="repair"
    detail[paddleocr]="add python-docx to the existing isolated uv tool environment"
  fi
}

report_paddle_gpu_status() {
  local cuda_details cuda_status device_count max_memory_mib python_path
  local gpu_summary
  [[ "$paddle_accelerator" == "nvidia" ]] || return 0
  python_path="$(uv_tool_python_path paddleocr paddleocr)" ||
    fail "PaddleOCR installed, but its uv environment could not be verified"
  if cuda_details="$(
    "$python_path" "$script_dir/check_paddle_cuda.py" 2>/dev/null
  )"; then
    IFS=$'\t' read -r device_count max_memory_mib gpu_summary \
      <<<"$cuda_details"
    printf 'notice: PaddleOCR CUDA ready: %s\n' "$gpu_summary"
    return 0
  fi
  cuda_status=$?
  if [[ $cuda_status -eq 1 ]]; then
    fail "PaddleOCR installed, but its PaddlePaddle runtime cannot use the NVIDIA GPU"
  fi
  if [[ $cuda_status -eq 3 ]]; then
    fail "PaddleOCR installed, but NVIDIA GPU 0 has compute capability below 7.0"
  fi
  if [[ $cuda_status -eq 4 ]]; then
    fail "PaddleOCR installed, but its CUDA build has no visible NVIDIA devices"
  fi
  fail "PaddleOCR installed, but its CUDA check failed"
}

inspect_chandra_hf_support() {
  local python_path
  if [[ "${action[chandra]}" != "skip" ]]; then
    return 0
  fi
  if ! python_path="$(uv_tool_python_path chandra-ocr chandra)"; then
    return 0
  fi
  uv_python[chandra]="$python_path"
  [[ -x "$python_path" ]] ||
    fail "Chandra's uv environment has no usable Python interpreter"
  if "$python_path" -c \
    'import torch, torchvision, transformers, accelerate' \
    >/dev/null 2>&1; then
    return
  fi

  load_uv_inventory
  uv_package_exists chandra-ocr ||
    fail "Chandra is missing Hugging Face dependencies, but its package ownership is unknown"
  action[chandra]="repair"
  detail[chandra]="add torch, torchvision, transformers, and accelerate for local Hugging Face inference"
}

report_chandra_gpu_status() {
  local cuda_details cuda_status device_count max_memory_mib python_path
  local gpu_summary
  command -v nvidia-smi >/dev/null 2>&1 || return 0
  nvidia-smi -L >/dev/null 2>&1 || return 0

  if ! python_path="$(uv_tool_python_path chandra-ocr chandra)"; then
    printf '%s\n' \
      "notice: NVIDIA GPU detected; skipped the CUDA check because Chandra's runtime is not owned by uv"
    return 0
  fi

  if cuda_details="$(
    "$python_path" "$script_dir/check_chandra_cuda.py"
  )"; then
    :
  else
    cuda_status=$?
    if [[ $cuda_status -eq 1 ]]; then
      printf '%s\n' \
        "warning: NVIDIA GPU detected, but Chandra's PyTorch runtime cannot use CUDA; verify the driver and PyTorch build"
    else
      printf '%s\n' \
        'warning: NVIDIA GPU detected, but the Chandra CUDA check failed'
    fi
    return 0
  fi

  IFS=$'\t' read -r device_count max_memory_mib gpu_summary \
    <<<"$cuda_details"
  printf 'notice: Chandra CUDA ready: %s\n' "$gpu_summary"
  if [[ "$device_count" == "1" && "$max_memory_mib" =~ ^[0-9]+$ &&
    $max_memory_mib -le 12288 ]]; then
    printf '%s\n' \
      'warning: Chandra OCR 2 has about 10.6 GB of BF16 weights; use Hugging Face batch size 1 and test one page or crop first'
  fi
}

inspect_paddle_nvidia_host

for tool_name in "${tools[@]}"; do
  case "$tool_name" in
    liteparse) inspect_liteparse ;;
    paddleocr) inspect_uv_tool paddleocr paddleocr paddleocr doc_parser --help ;;
    chandra) inspect_uv_tool chandra chandra chandra-ocr --help ;;
  esac
done

if [[ -v 'action[paddleocr]' ]]; then
  inspect_paddleocr_export_support
fi
if [[ -v 'action[chandra]' ]]; then
  inspect_chandra_hf_support
fi

declare -a uv_install_tools=()
install_liteparse=0
for tool_name in "${tools[@]}"; do
  if [[ "${action[$tool_name]}" == "skip" ]]; then
    printf 'skip: %s\n' "${detail[$tool_name]}"
    continue
  fi

  if [[ $dry_run -eq 1 ]]; then
    printf 'would %s: %s (%s)\n' \
      "${action[$tool_name]}" "$tool_name" "${detail[$tool_name]}"
    continue
  fi

  case "$tool_name" in
    liteparse) install_liteparse=1 ;;
    paddleocr|chandra) uv_install_tools+=("$tool_name") ;;
  esac
done

if [[ $dry_run -eq 1 ]]; then
  printf 'dry-run complete: no tools were installed\n'
  exit 0
fi

if [[ $install_liteparse -eq 1 ]]; then
  printf '%s: LiteParse with npm under %s\n' \
    "${action[liteparse]}" "${npm_prefix[liteparse]}"
  npm install --global --prefix "${npm_prefix[liteparse]}" \
    '@llamaindex/liteparse@^2.8'
  working_command liteparse --help ||
    fail "LiteParse installed, but liteparse is not usable from PATH"
  installed_liteparse_details="$(liteparse_package_details)" ||
    fail "LiteParse installed, but its npm package metadata is unavailable"
  IFS=$'\t' read -r installed_liteparse_version _ \
    <<<"$installed_liteparse_details"
  supported_liteparse_version "$installed_liteparse_version" ||
    fail "LiteParse installed with unsupported version: $installed_liteparse_version"
fi

cleanup() {
  if [[ -n "$install_tmp_dir" ]]; then
    case "$install_tmp_dir" in
      "${TMPDIR:-/tmp}"/ai-workflow-tools-install.*)
        rm -rf -- "$install_tmp_dir"
        ;;
    esac
  fi
}
trap cleanup EXIT

install_uv_tool() {
  local paddle_backup_bin="" paddle_backup_dir="" paddle_python
  local tool_name="$1"
  case "$tool_name" in
    paddleocr)
      if [[ "${action[paddleocr]}" == "repair" ]]; then
        uv pip install --python "${uv_python[paddleocr]}" \
          'python-docx>=1.1,<2'
      elif [[ "$paddle_accelerator" == "nvidia" ]]; then
        declare -a paddle_install_args=(
          tool install --python 3.12
          --index-strategy first-index
          --with 'python-docx>=1.1,<2'
          'paddleocr[doc-parser]>=3.7,<4'
        )
        if [[ "${action[paddleocr]}" == "reconfigure" ]]; then
          paddle_install_args=(tool install --force "${paddle_install_args[@]:2}")
          paddle_backup_dir="$uv_tools_dir/.paddleocr.ai-workflow-backup.$BASHPID"
          paddle_backup_bin="$install_tmp_dir/paddleocr-bin-backup.$BASHPID"
          [[ -d "$uv_tools_dir/paddleocr" ]] || {
            printf '%s\n' \
              "error: PaddleOCR's uv environment disappeared before reconfiguration" >&2
            return 1
          }
          [[ ! -e "$paddle_backup_dir" && ! -L "$paddle_backup_dir" ]] || {
            printf 'error: refusing to replace existing backup: %s\n' \
              "$paddle_backup_dir" >&2
            return 1
          }
          if [[ -e "$uv_bin_dir/paddleocr" || -L "$uv_bin_dir/paddleocr" ]]; then
            cp -a -- "$uv_bin_dir/paddleocr" "$paddle_backup_bin" || return 1
          fi
          if ! mv -- "$uv_tools_dir/paddleocr" "$paddle_backup_dir"; then
            rm -f -- "$paddle_backup_bin"
            return 1
          fi
        fi
        if uv "${paddle_install_args[@]}" &&
          paddle_python="$uv_tools_dir/paddleocr/bin/python" &&
          [[ -x "$paddle_python" ]] &&
          uv pip install --python "$paddle_python" \
            --index-strategy first-index \
            --index "$paddle_cuda_index" \
            'paddlepaddle-gpu>=3.3,<4' &&
          working_command paddleocr doc_parser --help &&
          "$paddle_python" -c 'import paddle, docx' >/dev/null 2>&1 &&
          "$paddle_python" "$script_dir/check_paddle_cuda.py" \
            >/dev/null 2>&1; then
          if [[ -n "$paddle_backup_dir" ]]; then
            rm -rf -- "$paddle_backup_dir"
            rm -f -- "$paddle_backup_bin"
          fi
        else
          if [[ -n "$paddle_backup_dir" && -d "$paddle_backup_dir" ]]; then
            rm -rf -- "$uv_tools_dir/paddleocr"
            mv -- "$paddle_backup_dir" "$uv_tools_dir/paddleocr"
            rm -f -- "$uv_bin_dir/paddleocr"
            if [[ -e "$paddle_backup_bin" || -L "$paddle_backup_bin" ]]; then
              mv -- "$paddle_backup_bin" "$uv_bin_dir/paddleocr"
            fi
            printf '%s\n' \
              'warning: PaddleOCR NVIDIA reconfiguration failed; restored the previous uv tool environment' >&2
          fi
          return 1
        fi
      else
        uv tool install --python 3.12 \
          --with 'paddlepaddle>=3.3,<4' \
          --with 'python-docx>=1.1,<2' \
          'paddleocr[doc-parser]>=3.7,<4'
      fi
      ;;
    chandra)
      if [[ "${action[chandra]}" == "repair" ]]; then
        uv pip install --python "${uv_python[chandra]}" \
          'chandra-ocr[hf]==0.2.0'
      else
        uv tool install --python 3.12 'chandra-ocr[hf]==0.2.0'
      fi
      ;;
  esac
}

declare -a batch_tools=() batch_pids=() batch_logs=()
wait_uv_batch() {
  local index status=0
  for ((index=0; index<${#batch_pids[@]}; index++)); do
    if wait "${batch_pids[$index]}"; then
      cat "${batch_logs[$index]}"
    else
      cat "${batch_logs[$index]}" >&2
      printf 'error: uv installation failed: %s\n' \
        "${batch_tools[$index]}" >&2
      status=1
    fi
  done
  batch_tools=()
  batch_pids=()
  batch_logs=()
  return "$status"
}

if ((${#uv_install_tools[@]})); then
  install_tmp_dir="$(
    mktemp -d "${TMPDIR:-/tmp}/ai-workflow-tools-install.XXXXXXXX"
  )" || fail "could not create the tool-install workspace"

  for tool_name in "${uv_install_tools[@]}"; do
    printf '%s: %s in an isolated uv tool environment\n' \
      "${action[$tool_name]}" "$tool_name"
    log_path="$install_tmp_dir/$tool_name.log"
    install_uv_tool "$tool_name" >"$log_path" 2>&1 &
    batch_tools+=("$tool_name")
    batch_pids+=("$!")
    batch_logs+=("$log_path")
    if ((${#batch_pids[@]} >= parallel_jobs)); then
      wait_uv_batch || fail "one or more uv tool installations failed"
    fi
  done
  wait_uv_batch || fail "one or more uv tool installations failed"

  for tool_name in "${uv_install_tools[@]}"; do
    case "$tool_name" in
      paddleocr)
        working_command paddleocr doc_parser --help ||
          fail "PaddleOCR installed, but its document parser is not usable from PATH"
        paddle_python="$(uv_tool_python_path paddleocr paddleocr)" ||
          fail "PaddleOCR installed, but its uv environment could not be verified"
        "$paddle_python" -c 'import paddle' >/dev/null 2>&1 ||
          fail "PaddleOCR installed, but its PaddlePaddle engine is unavailable"
        "$paddle_python" -c 'import docx' >/dev/null 2>&1 ||
          fail "PaddleOCR installed, but python-docx is unavailable"
        ;;
      chandra)
        working_command chandra --help ||
          fail "Chandra installed, but chandra is not usable from PATH"
        chandra_python="$(uv_tool_python_path chandra-ocr chandra)" ||
          fail "Chandra installed, but its uv environment could not be verified"
        "$chandra_python" -c \
          'import torch, torchvision, transformers, accelerate' \
          >/dev/null 2>&1 ||
          fail "Chandra installed, but Hugging Face dependencies are unavailable"
        ;;
    esac
  done
fi

if [[ -v 'action[paddleocr]' ]]; then
  report_paddle_gpu_status
fi
if [[ -v 'action[chandra]' ]]; then
  report_chandra_gpu_status
fi

printf 'tool installation complete\n'
printf 'notice: first OCR inference may download model weights\n'
