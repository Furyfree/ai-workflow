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

Research baseline: 2026-08-07.

| Need | First choice | Reason |
| --- | --- | --- |
| Exact reconstruction with nearby `.typ`, `.tex`, or `.md` source | Existing source plus rendered-document verification | Preserve authored formulas and structure without lossy extraction |
| Born-digital PDF, Office file, metadata, or page image | LiteParse 2.x | Extract embedded structure without unnecessary model inference |
| General document image or structured scan | PaddleOCR 3.7 with PaddleOCR-VL 1.6 | Compact 0.9B VLM, 109 languages, formulas, tables, charts, Markdown, and broad hardware support |
| Plain text with boxes and confidence | PaddleOCR PP-OCRv6 | Avoid a document VLM when layout reconstruction is unnecessary |
| Handwriting, forms, old scans, or difficult math | Chandra OCR 2 | Strong complex-layout, handwriting, form, table, and math results |
| Independent check of an uncertain crop | The other OCR engine | Different model families make disagreement useful evidence |
| Native Typst output | None | Convert verified Markdown with Pandoc |
| General photo understanding | A general vision model | Document tools do not interpret the whole scene reliably |

The vendors publish strong results on different benchmark suites. Do not treat
PaddleOCR's OmniDocBench score and Chandra's olmOCR score as a direct
head-to-head comparison. Prefer LiteParse before OCR when a PDF already has
usable embedded content. Prefer PaddleOCR as the practical structured-image
default because it is smaller and supports more local hardware paths. Add
Chandra where its specialties justify the 4B model and stricter weight license.

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

## One-time global setup

The agent installer links this unified skill globally for Codex and Claude
Code; it does not install document runtimes or model weights. From this
repository, explicitly preview and install all three runtime CLIs once:

```sh
./scripts/install-tools.sh --dry-run
./scripts/install-tools.sh
```

Select one runtime with `--tool liteparse`, `--tool paddleocr`, or
`--tool chandra`. The script verifies Node.js 18 or later, LiteParse 2.8 or
later, uv's tool executable directory, PaddleOCR's Word-export dependency, and
Chandra's local Hugging Face dependencies. It diagnoses an installed package
whose command is missing from `PATH` and never downloads model weights. It
requires an existing `npm` for LiteParse and `uv` for the OCR engines; it does
not bootstrap package managers.

Install PaddleOCR and Chandra in separate `uv` tools to prevent their Python
dependencies from contaminating each other. Use Python 3.12 because both
current stacks support it and newer system Python versions may not have
compatible ML wheels.

Use the direct commands below instead when selecting an accelerator-specific
PaddlePaddle build or another Chandra inference mode. Ensure the tool bin
directory reported by `uv tool dir --bin` is already on `PATH`.

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

For NVIDIA, Apple Silicon, AMD, Intel Arc, or another accelerator, follow the
official hardware guide and install only one compatible inference engine in
this environment. CUDA-specific wheels and indexes depend on the host driver;
do not guess them from a generic skill.

`python-docx` is explicit because PaddleOCR 3.7's CLI calls its all-format save
path even when Markdown and JSON are the desired outputs. Without it, a parse
can create those artifacts and then exit with `ModuleNotFoundError: docx`.
Inspect an output directory after any late save failure before rerunning costly
inference.

The installer verifies that an existing uv-managed tool can import its
PaddlePaddle engine before reporting it usable. If the import fails, install the
host-compatible engine explicitly; the generic installer will not guess a CPU,
CUDA, ROCm, XPU, or other build. When `python-docx` alone is missing, the
installer injects that package into the existing environment without recreating
it or replacing the engine.

The first `doc_parser` run downloads models and may download a rendering font.
Keep those network and disk changes explicit. Upgrade deliberately with
`uv tool upgrade paddleocr`, then rerun a known sample because PaddleOCR 3.x has
changed CLI and dependency contracts between minor releases. Remove it with
`uv tool uninstall paddleocr`.

## Chandra OCR

Current package: `chandra-ocr` 0.2.0. Current model: `chandra-ocr-2`, 4B
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
documents native Typst output. Use Pandoc 3.1.3 or later, which includes the
Typst writer.

Preserve OCR Markdown as the canonical source and convert beside its assets:

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
- Expect Chandra HF to need materially more memory than PaddleOCR-VL.
- On CPU-only hosts, benchmark one representative page before committing to a
  batch; prefer small crops for repeat readings.
- Use cropped second passes for uncertain formulas or table cells.
- Compare rendered output with the source; syntax is not semantic accuracy.
- Use hosted OCR only after approval because document content leaves the
  machine.
- Repository uninstall removes skill links only. Runtime and model-cache
  removal are separate user actions.

## Primary sources

- LiteParse: <https://developers.llamaindex.ai/python/cloud/llamaparse/features/liteparse/>
- PaddleOCR installation: <https://www.paddleocr.ai/main/en/version3.x/installation.html>
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
