#!/usr/bin/env python3
"""Report CUDA devices visible to Chandra's PyTorch runtime."""

from __future__ import annotations

import sys
from typing import Any

MIB = 1024 * 1024


def _load_torch() -> Any:
    import torch

    return torch


def cuda_details(torch: Any) -> tuple[int, int, str] | None:
    if not torch.cuda.is_available():
        return None

    device_count = torch.cuda.device_count()
    if device_count < 1:
        return None

    devices: list[tuple[str, int]] = []
    for index in range(device_count):
        name = str(torch.cuda.get_device_name(index))
        name = name.replace("\t", " ").replace("\r", " ").replace("\n", " ")
        memory_mib = torch.cuda.get_device_properties(index).total_memory // MIB
        devices.append((name, memory_mib))

    summary = "; ".join(
        f"{name} ({memory_mib} MiB)" for name, memory_mib in devices
    )
    return device_count, max(memory for _, memory in devices), summary


def main() -> int:
    try:
        details = cuda_details(_load_torch())
    except Exception as error:
        print(f"error: could not inspect Chandra CUDA support: {error}", file=sys.stderr)
        return 2

    if details is None:
        return 1

    device_count, max_memory_mib, summary = details
    print(f"{device_count}\t{max_memory_mib}\t{summary}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
