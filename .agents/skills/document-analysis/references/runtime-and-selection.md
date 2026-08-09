# Document runtime and engine selection

## Contents

- [Current recommendation](#current-recommendation)
- [Alternatives considered](#alternatives-considered)
- [One-time global setup](#one-time-global-setup)
- [LiteParse](#liteparse)
- [PaddleOCR](#paddleocr)
- [Chandra OCR](#chandra-ocr)
- [Markdown, LaTeX, and Typst](#markdown-latex-and-typst)
- [Operational notes](#operational-notes)
- [Primary sources](#primary-sources)

## Current recommendation

Research baseline: 2026-08-09.

| Need | First choice | Reason |
| --- | --- | --- |
| Exact reconstruction with nearby `.typ`, `.tex`, or `.md` source | Existing source plus rendered-document verification | Preserve authored formulas and structure without lossy extraction |
| Born-digital PDF, Office file, metadata, or page image | LiteParse 2.x | Extract embedded structure without unnecessary model inference |
| General document image or structured scan | Rendered source plus available approved native vision | Read math and layout in context and author the requested structure directly |
| Independent local structured sidecar | PaddleOCR 3.7 with PaddleOCR-VL 1.6 | Optional second reading for formulas, tables, charts, and reading order |
| Plain text with boxes and confidence | PaddleOCR PP-OCRv6 | Avoid a document VLM when layout reconstruction is unnecessary |
| Handwriting, forms, old scans, or difficult math needing another local reading | Chandra OCR 2, when viable | Optional specialty fallback with high hardware and time cost |
| Independent check of an uncertain crop | The other OCR engine | Different model families make disagreement useful evidence |
| Native Typst reconstruction | Vision-capable agent | Author directly, then compile and compare with the rendered source |
| Convert verified OCR Markdown to Typst | Pandoc | Structural conversion without another OCR pass |
| General photo understanding | A general vision model | Document tools do not interpret the whole scene reliably |

The vendors publish strong results on different benchmark suites. Do not treat
PaddleOCR's OmniDocBench score and Chandra's olmOCR score as a direct
head-to-head comparison. Prefer LiteParse before OCR when a PDF already has
usable native content. For an image-only PDF with a later OCR layer, use the
embedded text for navigation and prose hints but still judge formulas and
layout from the page image. When approved native vision is available, use it to
author and verify the final structure. PaddleOCR is an optional local second
reading, not a prerequisite, because even its smaller model adds material
latency. Add Chandra only where its specialties justify the 5B model, stricter
weight license, hardware cost, and elapsed time. Missing or impractical local
models do not block the native-vision route.

A local representative check on 2026-08-07 reinforced two limits. LiteParse
quickly recovered useful prose and headings from a born-digital mathematics
PDF, but omitted many variables, operators, and exponents. PaddleOCR-VL 1.6
produced usable Markdown and LaTeX from a full handwritten Danish mathematics
photo, including the main differential equation and final coefficients, but
also confused prose and several symbols. The CPU run took roughly nine minutes
and about 6 GB resident memory on a Ryzen AI 9 HX PRO 375. Treat these as local
routing evidence, not a general benchmark: use authored source when available,
fidelity-check formula passages, and scope CPU OCR to a page or crop first.

## Alternatives considered

- Surya OCR 2 is an attractive 650M option for constrained hardware and supports
  OCR, layout, tables, and math on NVIDIA through vLLM or on CPU and Apple
  Silicon through llama.cpp. Its published score is strongest for its size,
  while Chandra is the more capable Datalab model for handwriting and complex
  reconstruction.
- olmOCR 2 is a strong open 7B PDF-to-Markdown model for equations, tables,
  handwriting, and reading order, but its documented local path requires an
  NVIDIA GPU with at least 12 GB VRAM and about 30 GB of disk. It is a useful
  benchmark or fallback, not a lighter default than the selected OCR engines.
- Mathpix specializes in math OCR and direct document conversion, but it is a
  hosted commercial API. Mistral Document AI is also hosted. Use either only
  when the user prefers its service and approves uploading the source.

"Best" remains workload-specific. Benchmark suites, language mixes, image
quality, and output scoring differ. Validate the selected engines on a few
representative documents before a large conversion.

## Optional local runtime setup

The agent installer links this unified skill globally for Codex and Claude
Code; it does not install document runtimes or model weights. The skill does not
require every local runtime. Install only a selected tool when the user
explicitly requests that local route. Preview the exact selection first:

```sh
./scripts/install-tools.sh --tool paddleocr --dry-run
./scripts/install-tools.sh --tool paddleocr
```

Select one runtime with `--tool liteparse`, `--tool paddleocr`, or
`--tool chandra`. The script verifies Node.js 18 or later, LiteParse 2.8 or
later, uv's tool executable directory, PaddleOCR's Word-export dependency, and
Chandra's local Hugging Face dependencies. It diagnoses an installed package
whose command is missing from `PATH` and never downloads model weights. It
requires an existing `npm` for LiteParse and `uv` for the OCR engines; it does
not bootstrap package managers. The PaddleOCR and Chandra CUDA helpers only
report runtime and device readiness; they do not run OCR, download weights, or
make inference more accurate.

The default installs PaddleOCR's CPU engine only when PaddleOCR is absent and
preserves an existing working accelerator engine. On a Linux x86_64 NVIDIA
host, preview and explicitly select the GPU engine instead:

```sh
./scripts/install-tools.sh --tool paddleocr --accelerator nvidia --dry-run
./scripts/install-tools.sh --tool paddleocr --accelerator nvidia
```

This route requires `nvidia-smi` to report the driver. It selects the official
CUDA 12.6 wheel for driver 550.54.14 or later, otherwise the CUDA 11.8 wheel for
driver 450.80.02 or later. It rejects older drivers before package mutation.
It first resolves PaddleOCR from PyPI, then resolves only `paddlepaddle-gpu`
with the selected CUDA index. Both operations retain uv's dependency-confusion-
resistant `first-index` strategy; do not replace it with an `unsafe-*` strategy.
When a uv-managed PaddleOCR tool currently has the CPU engine, the explicit
NVIDIA command rebuilds that one isolated tool with `paddlepaddle-gpu`; it does
not alter Chandra, a project environment, the system Python, or the driver.
The installer retains the prior tool until the replacement passes its CUDA
check and restores it if package installation or verification fails. After
installation it verifies that PaddlePaddle sees at least one CUDA device.
GPU 0 must also have compute capability 7.0 or later, matching PaddleOCR-VL's
documented local inference requirement.

When Chandra is selected and `nvidia-smi` can see an NVIDIA GPU, the installer
also checks whether Chandra's isolated PyTorch runtime can use CUDA. It reports
the visible GPU memory and warns when a single GPU has at most 12 GB. The check
is advisory: CPU inference remains valid, and the installer does not replace
PyTorch, configure CUDA, or install a driver. Other tool selections and hosts
without a visible NVIDIA GPU skip this check.

Install PaddleOCR and Chandra in separate `uv` tools to prevent their Python
dependencies from contaminating each other. Use Python 3.12 because both
current stacks support it and newer system Python versions may not have
compatible ML wheels.

Use the direct commands below for the portable CPU engine or another Chandra
inference mode. Ensure the tool bin directory reported by `uv tool dir --bin`
is already on `PATH`.

## LiteParse

Current package: `@llamaindex/liteparse` 2.x. Require package version 2.8 or
later. The CLI currently reports a different internal version, so inspect npm
package metadata when exact package-version evidence matters.

```sh
npm install -g '@llamaindex/liteparse@^2.8'
liteparse --help
```

PDFs and images need no extra converter. Office formats require LibreOffice.
Remove the runtime with `npm uninstall -g @llamaindex/liteparse`.
The installer upgrades an unsupported older npm-owned release into the supported
2.x line but leaves an already supported release unchanged. Use the same npm
install command deliberately when checking for and installing a newer 2.x
release.

## PaddleOCR

Current package: `paddleocr` 3.7.0. Current document model family:
PaddleOCR-VL 1.6.

For CPU inference on supported Linux x64, install the document parser and one
PaddlePaddle engine in the same isolated environment:

```sh
uv tool install --python 3.12 \
  --with 'paddlepaddle>=3.3,<4' \
  --with 'python-docx>=1.1,<2' \
  'paddleocr[doc-parser]>=3.7,<4'
paddleocr doc_parser --help
```

For supported NVIDIA Linux x86_64 hosts, prefer the explicit installer route
above. It chooses between these current official package indexes:

| Driver | PaddlePaddle wheel index |
| --- | --- |
| 550.54.14 or later | CUDA 12.6 |
| 450.80.02 through 550.54.13 | CUDA 11.8 |

PaddlePaddle states that the wheel choice depends on the driver compatibility,
not whether a matching CUDA toolkit is installed system-wide. Apple Silicon,
AMD, Intel Arc, and other accelerators still require their official hardware
guide and exactly one compatible inference engine in the uv environment.

`python-docx` is explicit because PaddleOCR 3.7's CLI calls its all-format save
path even when Markdown and JSON are the desired outputs. Without it, a parse
can create those artifacts and then exit with `ModuleNotFoundError: docx`.
Inspect an output directory after any late save failure before rerunning costly
inference.

The installer verifies that an existing uv-managed tool can import its
PaddlePaddle engine before reporting it usable. The CPU route stops when the
engine import fails. The explicit NVIDIA route may safely rebuild that
uv-managed environment with the selected GPU engine and restores the prior
environment if replacement fails. When `python-docx` alone is missing, the
installer injects that package without recreating the tool or replacing its
engine. Only `--accelerator nvidia` authorizes engine replacement.

An RTX 3080 has sufficient compute capability for PaddleOCR-VL's documented
local NVIDIA path, and the 0.9B model is materially smaller than Chandra OCR 2.
That is not a 10 GB VRAM guarantee: run one representative page with explicit
GPU selection before a batch. The first run downloads model weights into the
user cache:

```sh
document_tmp_dir="$(mktemp -d)" || exit 1
readonly document_tmp_dir
document_path="/absolute/path/to/representative-page.png"

paddleocr doc_parser -i "$document_path" \
  --pipeline_version v1.6 --device gpu:0 \
  --save_path "$document_tmp_dir/paddle"
```

Inspect the saved Markdown and JSON against the source image. A successful CUDA
import is runtime readiness, not an OCR quality result.

The first `doc_parser` run downloads models and may download a rendering font.
Keep those network and disk changes explicit. Upgrade deliberately with
`uv tool upgrade paddleocr`. Because uv's receipt does not include the NVIDIA
engine injected from its separate package index, rerun
`install-tools.sh --tool paddleocr --accelerator nvidia` afterward. It safely
reinjects a missing engine. Then rerun a known sample because PaddleOCR 3.x has
changed CLI and dependency contracts between minor releases. Remove it with
`uv tool uninstall paddleocr`.

## Chandra OCR

Current package: `chandra-ocr` 0.2.0. Current model: `chandra-ocr-2`, 5B
parameters. Python 3.10 or later is required.

For local Hugging Face inference:

```sh
uv tool install --python 3.12 'chandra-ocr[hf]==0.2.0'
chandra --help
```

This installs PyTorch and Transformers and is substantially heavier than the
base package. The local path specifically requires `torch`, `torchvision`,
`transformers`, and `accelerate`. The installer verifies all four and adds the
`hf` extra in place when a uv-managed lightweight client is missing them. The
first inference downloads model weights. Confirm adequate memory and disk
first.

### Limited-VRAM NVIDIA GPUs

The Chandra OCR 2 model card lists a 5B BF16 model, and its published checkpoint
weights total about 10.6 GB. On a 10 GB RTX 3080, the raw weights consume almost
all nominal VRAM and leave no practical headroom for CUDA, image inputs,
activations, and generation. A 12 GB GPU also leaves little runtime headroom.
Chandra's Hugging Face loader uses `device_map="auto"`, so Transformers and
Accelerate may place layers on the CPU, but whether that succeeds and performs
acceptably also depends on system RAM, the installed PyTorch and CUDA build,
and the driver. A host with 32 GB system RAM has a reasonable starting pool for
limited CPU offload, but that is not an official minimum or a compatibility
guarantee.

In a local RTX 3080 10 GB test, the current Hugging Face route failed with CUDA
out of memory while loading weights, before OCR began. CPU inference loaded but
did not finish a 1241 by 900 handwritten-math crop after about 14.5 minutes.
Treat Chandra as unavailable for the planned large reconstruction on that host
unless its runtime changes materially; do not make it a readiness gate.

On this class of GPU, start with Hugging Face inference, a batch size of 1, and
one ambiguous page or crop. Batch size 1 is already the Hugging Face default;
keeping it explicit makes the smoke test reproducible. Do not start with a new
vLLM server on a memory-constrained card. This repository supports Linux; on a
Windows GPU host, use WSL2 only after the NVIDIA GPU is visible inside WSL2.
The installer does not configure GPU drivers or CUDA.

From this repository, install or repair the isolated runtime. When
`nvidia-smi` can see an NVIDIA GPU, the installer automatically verifies that
Chandra's PyTorch build can use it and reports the visible GPU memory:

```sh
./scripts/install-tools.sh --tool chandra
```

After approval for the first model download, run a one-page smoke test before a
larger job. Chandra's PDF page range is zero-based, so `0` selects the first
page and human page number `N` uses index `N-1`:

```sh
document_tmp_dir="$(mktemp -d)" || exit 1
readonly document_tmp_dir
document_path="/absolute/path/to/input.pdf"

chandra "$document_path" "$document_tmp_dir/chandra-page" \
  --method hf --page-range "0" --batch-size 1 --no-html --no-images
```

The first inference stores the weights in the global Hugging Face cache. Keep
that cache outside repositories and confirm that both cache storage and system
memory are adequate before approving the download.

For an NVIDIA vLLM deployment, the lighter client package is:

```sh
uv tool install --python 3.12 'chandra-ocr==0.2.0'
chandra --help
```

`chandra_vllm` starts a Docker-based server and may download images and model
weights. Starting it is a separate, explicit infrastructure action. Check the
endpoint before sending content; the client defaults to vLLM and can be pointed
elsewhere through `VLLM_API_BASE`.

Chandra's code is Apache-2.0, but its weights use a modified OpenRAIL-M license.
The published terms allow research, personal use, and qualifying startups, and
restrict competitive use and some broader commercial use. Review the current
model card before business use. Remove the tool with
`uv tool uninstall chandra-ocr`.

## Markdown, LaTeX, and Typst

Both OCR engines produce structured Markdown containing LaTeX math. Neither
documents native Typst output. When native Typst reconstruction is requested,
an available approved vision-capable agent can author Typst directly from the
source image and verify the render. Use Pandoc 3.1.3 or later only when
converting already verified Markdown.

For a requested Pandoc conversion, preserve verified OCR Markdown as the
canonical source and convert beside its assets. For direct Typst or another
non-Markdown reconstruction, keep the requested output canonical and preserve
OCR Markdown only as a sidecar:

```sh
pandoc input.md --from markdown+tex_math_dollars \
  --to latex --standalone --output output.tex

pandoc input.md --from markdown+tex_math_dollars \
  --to typst --standalone --output output.typ
```

If OCR output contains raw HTML tables, retain the Markdown reader's default
raw HTML support and inspect warnings. Pandoc can translate structure but
cannot correct OCR errors or guarantee an exact Typst or LaTeX equivalent.

When available, validate Typst with `typst compile output.typ`. Use the user's
LaTeX engine for `.tex`; do not introduce a TeX distribution implicitly.

## Operational notes

- Keep each OCR engine in its own `uv` environment.
- Keep model caches global rather than inside repositories.
- Treat local model inference as optional evidence, not a prerequisite merely
  because its CLI or CUDA runtime is available.
- Expect Chandra HF to need materially more memory than PaddleOCR-VL.
- For an image-based PDF with an embedded OCR layer, use LiteParse or that layer
  for search and prose, available approved native vision for reconstruction,
  and the rendered source image as authority. Use PaddleOCR-VL or Chandra only
  when an independent local reading could resolve uncertainty.
- Start local-model inference with one representative page or crop. Before a
  planned multi-page or whole-document local-model batch, benchmark a 5-10 page
  pilot spanning the document's relevant content classes.
- On CPU-only hosts, prefer small crops for repeat readings and do not expand
  the pilot unless the measured runtime makes the planned batch practical.
- Use cropped second passes for uncertain formulas or table cells.
- Compare rendered output with the source; syntax is not semantic accuracy.
- Use hosted OCR only after approval because document content leaves the
  machine.
- Repository uninstall removes skill links only. Runtime and model-cache
  removal are separate user actions.

## Primary sources

- LiteParse: <https://developers.llamaindex.ai/python/cloud/llamaparse/features/liteparse/>
- PaddleOCR installation: <https://www.paddleocr.ai/main/en/version3.x/installation.html>
- PaddlePaddle framework installation: <https://www.paddleocr.ai/main/en/version3.x/paddlepaddle_installation.html>
- PaddleOCR inference engines: <https://www.paddleocr.ai/main/en/version3.x/inference_deployment/local_inference/inference_engine.html>
- PaddleOCR-VL usage: <https://www.paddleocr.ai/main/en/version3.x/pipeline_usage/PaddleOCR-VL.html>
- PaddleOCR-VL 1.6: <https://www.paddleocr.ai/main/en/version3.x/algorithm/PaddleOCR-VL/PaddleOCR-VL-1.6.html>
- Chandra OCR 2: <https://github.com/datalab-to/chandra>
- Chandra model card: <https://huggingface.co/datalab-to/chandra-ocr-2>
- Surya OCR 2: <https://github.com/datalab-to/surya/releases/tag/v0.20.0>
- olmOCR 2: <https://github.com/allenai/olmocr>
- Mathpix OCR API: <https://docs.mathpix.com/>
- Mistral Document AI: <https://docs.mistral.ai/studio-api/document-processing/basic_ocr>
- Pandoc releases: <https://pandoc.org/releases.html>
- uv tools: <https://docs.astral.sh/uv/concepts/tools/>
