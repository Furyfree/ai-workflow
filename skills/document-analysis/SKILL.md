---
name: document-analysis
description: Read PDFs, Office files, scans, and photos of documents. Use when the user says "read this PDF", "what does this scan say", "summarise this document", "læs den her PDF", "hvad står der i det her dokument". Use instead of pdftotext. Not for Markdown or other text files in the repository.
---

# Document analysis

Use `liteparse`, not `lit` and not `pdftotext`. Work in `tmp=$(mktemp -d)` and
delete it when done. Notes and summaries go in the reply unless a file is
asked for.

| Document | Route |
| --- | --- |
| PDF with real text | `liteparse parse "$f" --format markdown` |
| Scan or photo of printed text | the same; LiteParse runs OCR itself |
| Math, handwriting, figures, messy tables | page image plus your own vision |
| Office file | LiteParse converts it; otherwise export to PDF first |

Page images for vision:

    liteparse screenshot "$f" --target-pages "3,7" --dpi 150 --output-dir "$tmp"

Danish scans: add `--ocr-language dan`. Large files: `--target-pages "1-20"`.

Parse first; send to vision only pages where the parsed text is missing or
garbled. Check `liteparse --help` when a flag is rejected.

When converting to Markdown, LaTeX, or Typst, write math from the page image,
not from parsed text. Say which pages you read by vision and which you could
not read.
