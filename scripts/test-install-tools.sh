#!/usr/bin/env bash
# The quoted fragments below are source for generated fake CLIs.
# shellcheck disable=SC2016
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
test_root="$(mktemp -d "${TMPDIR:-/tmp}/ai-workflow-tools-test.XXXXXXXX")"

cleanup() {
  case "$test_root" in
    "${TMPDIR:-/tmp}"/ai-workflow-tools-test.*) rm -rf -- "$test_root" ;;
  esac
}
trap cleanup EXIT

fail() {
  printf 'error: %s\n' "$1" >&2
  exit 1
}

base_bin="$test_root/base-bin"
mkdir -p "$base_bin"
for command_name in bash cat chmod cp dirname env grep ln mkdir mktemp readlink rm sleep; do
  command_path="$(command -v "$command_name")" ||
    fail "test dependency missing: $command_name"
  ln -s "$command_path" "$base_bin/$command_name"
done

make_fake_command() {
  local path="$1"
  shift
  printf '%s\n' '#!/usr/bin/env bash' 'set -euo pipefail' "$@" >"$path"
  chmod +x "$path"
}

installed_bin="$test_root/installed-bin"
mkdir -p "$installed_bin"
make_fake_command "$installed_bin/liteparse" \
  '[[ "${1:-}" == "--help" ]] || exit 2'
make_fake_command "$installed_bin/paddleocr" \
  '[[ "${1:-}:${2:-}" == "doc_parser:--help" ]] || exit 2'
make_fake_command "$installed_bin/chandra" \
  '[[ "${1:-}" == "--help" ]] || exit 2'

installed_output="$(
  PATH="$installed_bin:$base_bin" \
    "$repo_root/scripts/install-tools.sh" --dry-run
)"
for expected in \
  "skip: LiteParse is available" \
  "skip: paddleocr is available" \
  "skip: chandra is available" \
  "dry-run complete: no tools were installed"; do
  grep -Fq "$expected" <<<"$installed_output" ||
    fail "installed-tool check did not report: $expected"
done

manager_bin="$test_root/manager-bin"
manager_log="$test_root/manager.log"
mkdir -p "$manager_bin"
ln -s "$(command -v node)" "$manager_bin/node"
make_fake_command "$manager_bin/npm" \
  'case "${1:-}:${2:-}" in' \
  '  prefix:--global) printf "%s\n" "${FAKE_NPM_PREFIX:-/tmp/fake-npm-prefix}" ;;' \
  '  install:--global)' \
  '    printf "npm %s\n" "$*" >>"$FAKE_MANAGER_LOG"' \
  '    if [[ -n "${FAKE_INSTALL_BIN:-}" && -n "${FAKE_NPM_PREFIX:-}" ]]; then' \
  '      package_dir="$FAKE_NPM_PREFIX/lib/node_modules/@llamaindex/liteparse"' \
  '      mkdir -p "$package_dir/dist"' \
  '      cp "$FAKE_COMMAND_SOURCE/liteparse" "$package_dir/dist/liteparse"' \
  '      printf "{\"version\":\"2.11.0\"}\n" >"$package_dir/package.json"' \
  '      ln -s "$package_dir/dist/liteparse" "$FAKE_INSTALL_BIN/liteparse"' \
  '    fi' \
  '    ;;' \
  '  *) exit 2 ;;' \
  'esac'
make_fake_command "$manager_bin/uv" \
  'case "${1:-}:${2:-}" in' \
  '  tool:list) exit 0 ;;' \
  '  tool:dir)' \
  '    if [[ "${3:-}" == "--bin" ]]; then' \
  '      printf "%s\n" "${FAKE_UV_BIN_DIR:-$(dirname "$0")}"' \
  '    else' \
  '      printf "%s\n" "${FAKE_UV_TOOLS_DIR:-$(dirname "$0")/tools}"' \
  '    fi' \
  '    ;;' \
  '  tool:install)' \
  '    if [[ "${FAKE_REQUIRE_PARALLEL:-false}" == "true" ]]; then' \
  '      case "$*" in' \
  '        *paddleocr*) current=paddleocr; other=chandra ;;' \
  '        *chandra-ocr*) current=chandra; other=paddleocr ;;' \
  '        *) exit 2 ;;' \
  '      esac' \
  '      : >"$FAKE_INSTALL_BIN/$current.started"' \
  '      for ((attempt=0; attempt<200; attempt++)); do' \
  '        [[ ! -e "$FAKE_INSTALL_BIN/$other.started" ]] || break' \
  '        sleep 0.01' \
  '      done' \
  '      [[ -e "$FAKE_INSTALL_BIN/$other.started" ]] || exit 3' \
  '    fi' \
  '    printf "uv %s\n" "$*" >>"$FAKE_MANAGER_LOG"' \
  '    if [[ -n "${FAKE_INSTALL_BIN:-}" && -n "${FAKE_UV_TOOLS_DIR:-}" ]]; then' \
  '      case "$*" in' \
  '        *paddleocr*)' \
  '          mkdir -p "$FAKE_UV_TOOLS_DIR/paddleocr/bin"' \
  '          ln -s "$FAKE_COMMAND_SOURCE/paddleocr" "$FAKE_UV_TOOLS_DIR/paddleocr/bin/paddleocr"' \
  '          ln -s "$FAKE_COMMAND_SOURCE/python-complete" "$FAKE_UV_TOOLS_DIR/paddleocr/bin/python"' \
  '          ln -s "$FAKE_UV_TOOLS_DIR/paddleocr/bin/paddleocr" "$FAKE_INSTALL_BIN/paddleocr"' \
  '          ;;' \
  '        *chandra-ocr*)' \
  '          mkdir -p "$FAKE_UV_TOOLS_DIR/chandra-ocr/bin"' \
  '          ln -s "$FAKE_COMMAND_SOURCE/chandra" "$FAKE_UV_TOOLS_DIR/chandra-ocr/bin/chandra"' \
  '          ln -s "$FAKE_COMMAND_SOURCE/python-complete" "$FAKE_UV_TOOLS_DIR/chandra-ocr/bin/python"' \
  '          ln -s "$FAKE_UV_TOOLS_DIR/chandra-ocr/bin/chandra" "$FAKE_INSTALL_BIN/chandra"' \
  '          ;;' \
  '      esac' \
  '    fi' \
  '    ;;' \
  '  pip:install)' \
  '    printf "uv %s\n" "$*" >>"$FAKE_MANAGER_LOG"' \
  '    python_path=""' \
  '    for argument in "$@"; do' \
  '      if [[ "$python_path" == "next" ]]; then python_path="$argument"; break; fi' \
  '      [[ "$argument" != "--python" ]] || python_path=next' \
  '    done' \
  '    [[ "$python_path" != "" && "$python_path" != "next" ]] || exit 2' \
  '    ln -sf "$FAKE_COMMAND_SOURCE/python-complete" "$python_path"' \
  '    ;;' \
  '  *) exit 2 ;;' \
  'esac'

dry_output="$(
  PATH="$manager_bin:$base_bin" FAKE_MANAGER_LOG="$manager_log" \
    "$repo_root/scripts/install-tools.sh" --dry-run
)"
[[ ! -e "$manager_log" ]] || fail "dry-run invoked a package installation"
for expected in \
  "would install: liteparse" \
  "would install: paddleocr" \
  "would install: chandra"; do
  grep -Fq "$expected" <<<"$dry_output" ||
    fail "dry-run did not report: $expected"
done

preflight_bin="$test_root/preflight-bin"
preflight_log="$test_root/preflight.log"
preflight_error="$test_root/preflight-error.log"
mkdir -p "$preflight_bin"
cp "$manager_bin/npm" "$preflight_bin/"
cp -P "$manager_bin/node" "$preflight_bin/"
if PATH="$preflight_bin:$base_bin" FAKE_MANAGER_LOG="$preflight_log" \
  "$repo_root/scripts/install-tools.sh" \
  >"$preflight_error" 2>&1; then
  fail "installer proceeded without uv"
fi
[[ ! -e "$preflight_log" ]] ||
  fail "installer changed npm state before completing preflight"
grep -Fq "uv is required to install PaddleOCR and Chandra" \
  "$preflight_error" || fail "missing uv preflight was not explained"

run_bin="$test_root/run-bin"
run_log="$test_root/run.log"
mkdir -p "$run_bin"
cp "$manager_bin/npm" "$manager_bin/uv" "$run_bin/"
cp -P "$manager_bin/node" "$run_bin/"
command_source="$test_root/command-source"
run_tools="$test_root/run-tools"
mkdir -p "$command_source"
make_fake_command "$command_source/liteparse" \
  '[[ "${1:-}" == "--help" ]] || exit 2'
make_fake_command "$command_source/paddleocr" \
  '[[ "${1:-}:${2:-}" == "doc_parser:--help" ]] || exit 2'
make_fake_command "$command_source/chandra" \
  '[[ "${1:-}" == "--help" ]] || exit 2'
make_fake_command "$command_source/python-complete" \
  '[[ "${1:-}" == "-c" ]] || exit 2'

PATH="$run_bin:$base_bin" FAKE_MANAGER_LOG="$run_log" \
  FAKE_INSTALL_BIN="$run_bin" FAKE_COMMAND_SOURCE="$command_source" \
  FAKE_NPM_PREFIX="$test_root/fake-npm-prefix" \
  FAKE_UV_BIN_DIR="$run_bin" FAKE_UV_TOOLS_DIR="$run_tools" \
  FAKE_REQUIRE_PARALLEL=true \
  "$repo_root/scripts/install-tools.sh" >/dev/null
grep -Fqx \
  "npm install --global --prefix $test_root/fake-npm-prefix @llamaindex/liteparse@^2.8" \
  "$run_log" || fail "LiteParse install command was not exact"
grep -Fqx \
  "uv tool install --python 3.12 --with paddlepaddle>=3.3,<4 --with python-docx>=1.1,<2 paddleocr[doc-parser]>=3.7,<4" \
  "$run_log" || fail "PaddleOCR install command was not exact"
grep -Fqx \
  "uv tool install --python 3.12 chandra-ocr[hf]==0.2.0" \
  "$run_log" || fail "Chandra install command was not exact"

first_run_log="$(<"$run_log")"
second_run_output="$(
  PATH="$run_bin:$base_bin" FAKE_MANAGER_LOG="$run_log" \
    FAKE_INSTALL_BIN="$run_bin" FAKE_COMMAND_SOURCE="$command_source" \
    FAKE_NPM_PREFIX="$test_root/fake-npm-prefix" \
    FAKE_UV_BIN_DIR="$run_bin" FAKE_UV_TOOLS_DIR="$run_tools" \
    "$repo_root/scripts/install-tools.sh"
)"
[[ "$(<"$run_log")" == "$first_run_log" ]] ||
  fail "repeated installation invoked a package manager"
for expected in \
  "skip: LiteParse 2.11.0 is available" \
  "skip: paddleocr is available" \
  "skip: chandra is available"; do
  grep -Fq "$expected" <<<"$second_run_output" ||
    fail "repeated installation did not report: $expected"
done

repair_bin="$test_root/repair-bin"
repair_tools="$test_root/tools/paddleocr/bin"
mkdir -p "$repair_bin" "$repair_tools"
make_fake_command "$repair_tools/paddleocr" \
  '[[ "${1:-}:${2:-}" == "doc_parser:--help" ]] || exit 2'
make_fake_command "$repair_tools/python" \
  '[[ "${1:-}" == "-c" ]] || exit 2' \
  '[[ "${2:-}" == "import paddle" ]]'
printf 'keep accelerator configuration\n' >"$repair_tools/accelerator.marker"
ln -s "$repair_tools/paddleocr" "$repair_bin/paddleocr"
make_fake_command "$repair_bin/uv" \
  'case "${1:-}:${2:-}" in' \
  '  tool:list) printf "paddleocr v3.7.0\n- paddleocr\n" ;;' \
  '  tool:dir)' \
  '    [[ "${3:-}" != "--bin" ]] && printf "%s\n" "$FAKE_UV_TOOLS_DIR" || printf "%s\n" "$FAKE_UV_BIN_DIR"' \
  '    ;;' \
  '  pip:install)' \
  '    printf "uv %s\n" "$*" >>"$FAKE_MANAGER_LOG"' \
  '    ln -sf "$FAKE_COMMAND_SOURCE/python-complete" "$FAKE_UV_TOOLS_DIR/paddleocr/bin/python"' \
  '    ;;' \
  '  *) exit 2 ;;' \
  'esac'
repair_output="$(
  PATH="$repair_bin:$base_bin" FAKE_MANAGER_LOG="$manager_log" \
    FAKE_COMMAND_SOURCE="$command_source" \
    FAKE_UV_BIN_DIR="$repair_bin" FAKE_UV_TOOLS_DIR="$test_root/tools" \
    "$repo_root/scripts/install-tools.sh" --tool paddleocr --dry-run
)"
grep -Fq "would repair: paddleocr (add python-docx" <<<"$repair_output" ||
  fail "installer did not plan repair for incomplete PaddleOCR export support"

repair_log="$test_root/repair.log"
PATH="$repair_bin:$base_bin" FAKE_MANAGER_LOG="$repair_log" \
  FAKE_COMMAND_SOURCE="$command_source" \
  FAKE_UV_BIN_DIR="$repair_bin" FAKE_UV_TOOLS_DIR="$test_root/tools" \
  "$repo_root/scripts/install-tools.sh" --tool paddleocr >/dev/null
grep -Fqx \
  "uv pip install --python $repair_tools/python python-docx>=1.1,<2" \
  "$repair_log" || fail "PaddleOCR repair did not inject only python-docx"
[[ -f "$repair_tools/accelerator.marker" ]] ||
  fail "PaddleOCR repair replaced the existing accelerator environment"

missing_engine_bin="$test_root/missing-engine-bin"
missing_engine_tools_root="$test_root/missing-engine-tools"
missing_engine_tools="$missing_engine_tools_root/paddleocr/bin"
missing_engine_error="$test_root/missing-engine-error.log"
missing_engine_log="$test_root/missing-engine-manager.log"
mkdir -p "$missing_engine_bin" "$missing_engine_tools"
make_fake_command "$missing_engine_tools/paddleocr" \
  '[[ "${1:-}:${2:-}" == "doc_parser:--help" ]] || exit 2'
make_fake_command "$missing_engine_tools/python" \
  '[[ "${1:-}:${2:-}" == "-c:import docx" ]]'
ln -s "$missing_engine_tools/paddleocr" "$missing_engine_bin/paddleocr"
make_fake_command "$missing_engine_bin/uv" \
  'case "${1:-}:${2:-}" in' \
  '  tool:list) printf "paddleocr v3.7.0\n- paddleocr\n" ;;' \
  '  tool:dir)' \
  '    [[ "${3:-}" != "--bin" ]] && printf "%s\n" "$FAKE_UV_TOOLS_DIR" || printf "%s\n" "$FAKE_UV_BIN_DIR"' \
  '    ;;' \
  '  pip:install) printf "uv %s\n" "$*" >>"$FAKE_MANAGER_LOG" ;;' \
  '  *) exit 2 ;;' \
  'esac'
if PATH="$missing_engine_bin:$base_bin" \
  FAKE_MANAGER_LOG="$missing_engine_log" \
  FAKE_UV_BIN_DIR="$missing_engine_bin" \
  FAKE_UV_TOOLS_DIR="$missing_engine_tools_root" \
  "$repo_root/scripts/install-tools.sh" --tool paddleocr --dry-run \
  >"$missing_engine_error" 2>&1; then
  fail "installer accepted PaddleOCR without a working inference engine"
fi
grep -Fq "cannot import a PaddlePaddle engine" "$missing_engine_error" ||
  fail "missing PaddlePaddle engine was not explained"
[[ ! -e "$missing_engine_log" ]] ||
  fail "missing PaddlePaddle engine triggered package installation"

chandra_repair_bin="$test_root/chandra-repair-bin"
chandra_tools_root="$test_root/chandra-tools"
chandra_tools="$chandra_tools_root/chandra-ocr/bin"
chandra_repair_log="$test_root/chandra-repair.log"
mkdir -p "$chandra_repair_bin" "$chandra_tools"
make_fake_command "$chandra_tools/chandra" \
  '[[ "${1:-}" == "--help" ]] || exit 2'
make_fake_command "$chandra_tools/python" 'exit 1'
ln -s "$chandra_tools/chandra" "$chandra_repair_bin/chandra"
make_fake_command "$chandra_repair_bin/uv" \
  'case "${1:-}:${2:-}" in' \
  '  tool:list) printf "chandra-ocr v0.2.0\n- chandra\n" ;;' \
  '  tool:dir)' \
  '    [[ "${3:-}" != "--bin" ]] && printf "%s\n" "$FAKE_UV_TOOLS_DIR" || printf "%s\n" "$FAKE_UV_BIN_DIR"' \
  '    ;;' \
  '  pip:install)' \
  '    printf "uv %s\n" "$*" >>"$FAKE_MANAGER_LOG"' \
  '    ln -sf "$FAKE_COMMAND_SOURCE/python-complete" "$FAKE_UV_TOOLS_DIR/chandra-ocr/bin/python"' \
  '    ;;' \
  '  *) exit 2 ;;' \
  'esac'
chandra_repair_output="$(
  PATH="$chandra_repair_bin:$base_bin" \
    FAKE_MANAGER_LOG="$chandra_repair_log" \
    FAKE_COMMAND_SOURCE="$command_source" \
    FAKE_UV_BIN_DIR="$chandra_repair_bin" \
    FAKE_UV_TOOLS_DIR="$chandra_tools_root" \
    "$repo_root/scripts/install-tools.sh" --tool chandra --dry-run
)"
grep -Fq "would repair: chandra (add torch, torchvision, transformers, and accelerate" \
  <<<"$chandra_repair_output" ||
  fail "installer did not plan repair for incomplete Chandra HF support"

PATH="$chandra_repair_bin:$base_bin" \
  FAKE_MANAGER_LOG="$chandra_repair_log" \
  FAKE_COMMAND_SOURCE="$command_source" \
  FAKE_UV_BIN_DIR="$chandra_repair_bin" \
  FAKE_UV_TOOLS_DIR="$chandra_tools_root" \
  "$repo_root/scripts/install-tools.sh" --tool chandra >/dev/null
grep -Fqx \
  "uv pip install --python $chandra_tools/python chandra-ocr[hf]==0.2.0" \
  "$chandra_repair_log" || fail "Chandra repair did not add the HF extra"

gpu_bin="$test_root/gpu-bin"
gpu_tools_root="$test_root/gpu-tools"
gpu_tools="$gpu_tools_root/chandra-ocr/bin"
gpu_probe_log="$test_root/gpu-probe.log"
mkdir -p "$gpu_bin" "$gpu_tools"
make_fake_command "$gpu_tools/chandra" \
  '[[ "$1" == "--help" ]] || exit 2'
make_fake_command "$gpu_tools/python" \
  'if [[ "$1" == "-c" ]]; then' \
  '  [[ "$2" == "import torch, torchvision, transformers, accelerate" ]]' \
  '  exit' \
  'fi' \
  '[[ "$1" == */check_chandra_cuda.py ]] || exit 2' \
  'if [[ "$FAKE_CUDA_READY" == "true" ]]; then' \
  '  printf "1\t10240\tNVIDIA GeForce RTX 3080 (10240 MiB)\n"' \
  '  exit 0' \
  'fi' \
  'exit 1'
ln -s "$gpu_tools/chandra" "$gpu_bin/chandra"
make_fake_command "$gpu_bin/uv" \
  'case "$1:$2" in' \
  '  tool:list) printf "chandra-ocr v0.2.0\n- chandra\n" ;;' \
  '  tool:dir)' \
  '    [[ "$*" != "tool dir --bin" ]] && printf "%s\n" "$FAKE_UV_TOOLS_DIR" || printf "%s\n" "$FAKE_UV_BIN_DIR"' \
  '    ;;' \
  '  *) exit 2 ;;' \
  'esac'
make_fake_command "$gpu_bin/nvidia-smi" \
  '[[ "$1" == "-L" ]] || exit 2' \
  'printf "probe\n" >>"$FAKE_GPU_PROBE_LOG"' \
  'printf "GPU 0: NVIDIA GeForce RTX 3080\n"'
make_fake_command "$gpu_bin/liteparse" \
  '[[ "$1" == "--help" ]] || exit 2'

gpu_missing_output="$(
  PATH="$gpu_bin:$base_bin" FAKE_CUDA_READY=false \
    FAKE_GPU_PROBE_LOG="$gpu_probe_log" \
    FAKE_UV_BIN_DIR="$gpu_bin" FAKE_UV_TOOLS_DIR="$gpu_tools_root" \
    "$repo_root/scripts/install-tools.sh" --tool chandra
)"
grep -Fq "NVIDIA GPU detected, but Chandra's PyTorch runtime cannot use CUDA" \
  <<<"$gpu_missing_output" ||
  fail "Chandra GPU check did not report an unusable CUDA runtime"

gpu_ready_output="$(
  PATH="$gpu_bin:$base_bin" FAKE_CUDA_READY=true \
    FAKE_GPU_PROBE_LOG="$gpu_probe_log" \
    FAKE_UV_BIN_DIR="$gpu_bin" FAKE_UV_TOOLS_DIR="$gpu_tools_root" \
    "$repo_root/scripts/install-tools.sh" --tool chandra
)"
grep -Fq \
  "notice: Chandra CUDA ready: NVIDIA GeForce RTX 3080 (10240 MiB)" \
  <<<"$gpu_ready_output" ||
  fail "Chandra GPU check did not report the CUDA device"
grep -Fq "about 10.6 GB of BF16 weights" <<<"$gpu_ready_output" ||
  fail "Chandra GPU check did not warn about limited VRAM"

rm -f -- "$gpu_probe_log"
PATH="$gpu_bin:$base_bin" "$repo_root/scripts/install-tools.sh" \
  --tool liteparse >/dev/null
[[ ! -e "$gpu_probe_log" ]] ||
  fail "non-Chandra installation invoked the NVIDIA GPU check"

old_liteparse_prefix="$test_root/old-liteparse-prefix"
old_liteparse_package="$old_liteparse_prefix/lib/node_modules/@llamaindex/liteparse"
old_liteparse_bin="$test_root/old-liteparse-bin"
mkdir -p "$old_liteparse_package/dist" "$old_liteparse_bin"
printf '{"version":"2.7.0"}\n' >"$old_liteparse_package/package.json"
make_fake_command "$old_liteparse_package/dist/cli.js" \
  '[[ "${1:-}" == "--help" ]] || exit 2'
ln -s "$old_liteparse_package/dist/cli.js" "$old_liteparse_bin/liteparse"
ln -s "$(command -v node)" "$old_liteparse_bin/node"
old_liteparse_output="$(
  PATH="$old_liteparse_bin:$manager_bin:$base_bin" \
    "$repo_root/scripts/install-tools.sh" --tool liteparse --dry-run
)"
grep -Fq "would upgrade: liteparse (replace unsupported LiteParse 2.7.0" \
  <<<"$old_liteparse_output" ||
  fail "installer accepted an unsupported LiteParse version"

old_node_bin="$test_root/old-node-bin"
old_node_error="$test_root/old-node-error.log"
mkdir -p "$old_node_bin"
cp "$manager_bin/npm" "$old_node_bin/npm"
make_fake_command "$old_node_bin/node" 'printf "16.20.0\n"'
if PATH="$old_node_bin:$base_bin" \
  "$repo_root/scripts/install-tools.sh" --tool liteparse --dry-run \
  >"$old_node_error" 2>&1; then
  fail "installer accepted an unsupported Node.js version"
fi
grep -Fq "Node.js 18 or later is required; found 16.20.0" \
  "$old_node_error" || fail "unsupported Node.js was not explained"

missing_uv_bin="$test_root/missing-uv-bin"
missing_uv_bin_error="$test_root/missing-uv-bin.log"
mkdir -p "$missing_uv_bin"
make_fake_command "$missing_uv_bin/uv" \
  'case "${1:-}:${2:-}" in' \
  '  tool:list) exit 0 ;;' \
  '  tool:dir)' \
  '    [[ "${3:-}" != "--bin" ]] && printf "/tmp/fake-uv-tools\n" || printf "/tmp/fake-uv-bin-not-on-path\n"' \
  '    ;;' \
  '  *) exit 2 ;;' \
  'esac'
if PATH="$missing_uv_bin:$base_bin" \
  "$repo_root/scripts/install-tools.sh" --tool chandra --dry-run \
  >"$missing_uv_bin_error" 2>&1; then
  fail "installer accepted a uv tool bin directory missing from PATH"
fi
grep -Fq "uv's tool executable directory is not on PATH" \
  "$missing_uv_bin_error" || fail "missing uv tool bin was not explained"

package_bin="$test_root/package-bin"
mkdir -p "$package_bin"
make_fake_command "$package_bin/uv" \
  'case "${1:-}:${2:-}" in' \
  '  tool:list) printf "paddleocr v3.7.0\n- paddleocr\n" ;;' \
  '  tool:dir)' \
  '    [[ "${3:-}" != "--bin" ]] && printf "/tmp/fake-uv-tools\n" || printf "%s\n" "$(dirname "$0")"' \
  '    ;;' \
  '  *) exit 2 ;;' \
  'esac'
package_error="$test_root/package-error.log"
if PATH="$package_bin:$base_bin" \
  "$repo_root/scripts/install-tools.sh" --tool paddleocr --dry-run \
  >"$package_error" 2>&1; then
  fail "installer accepted a uv package whose command is missing"
fi
grep -Fq "paddleocr is installed as a uv tool but paddleocr is not on PATH" \
  "$package_error" || fail "missing PATH diagnosis was not reported"

broken_bin="$test_root/broken-bin"
mkdir -p "$broken_bin"
make_fake_command "$broken_bin/chandra" 'exit 1'
broken_error="$test_root/broken-error.log"
if PATH="$broken_bin:$base_bin" \
  "$repo_root/scripts/install-tools.sh" --tool chandra --dry-run \
  >"$broken_error" 2>&1; then
  fail "installer accepted a broken existing command"
fi
grep -Fq "chandra exists on PATH but does not run successfully" \
  "$broken_error" || fail "broken command diagnosis was not reported"

argument_error="$test_root/argument-error.log"
if "$repo_root/scripts/install-tools.sh" --tool >"$argument_error" 2>&1; then
  fail "installer accepted a missing --tool value"
fi
grep -Fqx "error: --tool requires a value" "$argument_error" ||
  fail "missing --tool value was not explained"
if "$repo_root/scripts/install-tools.sh" --jobs 0 \
  >"$argument_error" 2>&1; then
  fail "installer accepted a non-positive --jobs value"
fi
grep -Fqx "error: --jobs must be a positive integer" "$argument_error" ||
  fail "invalid --jobs value was not explained"

printf 'tool installer tests passed\n'
