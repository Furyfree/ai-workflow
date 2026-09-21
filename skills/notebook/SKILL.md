---
name: notebook
description: Read Jupyter notebooks (.ipynb) fast and correctly. Use when the user says "read this notebook", "what does this notebook do", "summarise the notebook", "læs den her notebook", "kig på notebooken", "hvad sker der i den her ipynb", or when any task needs the content of an .ipynb file. Not for editing notebooks.
---

# Notebook

Never open an `.ipynb` file raw. Most of it is image data and long outputs; the
real content is a few percent. Use `nb.py`, which sits next to this file:

    python3 nb.py FILE.ipynb                  # every cell, outputs cut to 20 lines
    python3 nb.py FILE.ipynb --no-outputs     # code and text only: the overview
    python3 nb.py FILE.ipynb --cells 10-20    # one part, by cell number
    python3 nb.py FILE.ipynb --max-lines 60   # longer outputs
    python3 nb.py FILE.ipynb --images "$tmp"  # also write plots and pasted images

1. Large notebook: run `--no-outputs` first, then `--cells` for the part that
   matters.
2. Plots and pasted images show as `[image: cell12-out1, png, 48 KB]`. When one
   matters for the answer, rerun with `--images "$tmp"` using
   `tmp=$(mktemp -d)`, look at that file with vision, and delete `$tmp` after.
3. Maths output is LaTeX from SymPy. Read it as the result; do not recompute it.
4. Refer to cells by their number, such as "cell 14", so I can find them.

To change a notebook, use your harness's notebook edit tool. Without one, ask
before touching the JSON.
