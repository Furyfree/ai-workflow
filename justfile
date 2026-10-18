default:
    @just --list

setup:
    pnpm install --frozen-lockfile --ignore-scripts
    uv sync --locked

[positional-arguments]
install *args:
    python install.py "$@"

update-vendor:
    python update_vendor.py

lint:
    uv run --locked ruff check .
    uv run --locked ruff format --check .
    pnpm run lint

format:
    uv run --locked ruff format .
    pnpm run format

typecheck-python:
    uv run --locked basedpyright

typecheck-typescript:
    pnpm exec tsc --noEmit
