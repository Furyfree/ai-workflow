#!/usr/bin/env python3
"""Report CUDA devices visible to PaddleOCR's PaddlePaddle runtime."""

from __future__ import annotations

import sys
from typing import Any

MIB = 1024 * 1024


class UnsupportedCudaCapabilityError(RuntimeError):
    """Raised when GPU 0 cannot run PaddleOCR-VL local inference."""


class CudaDeviceUnavailableError(RuntimeError):
    """Raised when a CUDA build cannot see an NVIDIA device."""


def _load_paddle() -> Any:
    import paddle

    return paddle


def cuda_details(paddle: Any) -> tuple[int, int, str] | None:
    if not paddle.device.is_compiled_with_cuda():
        return None

    device_count = paddle.device.cuda.device_count()
    if device_count < 1:
        raise CudaDeviceUnavailableError(
            "the PaddlePaddle CUDA build has no visible NVIDIA devices"
        )

    devices: list[tuple[str, int, int, int]] = []
    for index in range(device_count):
        name = str(paddle.device.cuda.get_device_name(index))
        name = name.replace("\t", " ").replace("\r", " ").replace("\n", " ")
        properties = paddle.device.cuda.get_device_properties(index)
        memory_mib = int(properties.total_memory) // MIB
        capability = paddle.device.cuda.get_device_capability(index)
        major, minor = int(capability[0]), int(capability[1])
        devices.append((name, memory_mib, major, minor))

    if devices[0][2] < 7:
        major, minor = devices[0][2], devices[0][3]
        raise UnsupportedCudaCapabilityError(
            f"GPU 0 has compute capability {major}.{minor}; 7.0 or later is required"
        )

    summary = "; ".join(
        f"{name} ({memory_mib} MiB, compute {major}.{minor})"
        for name, memory_mib, major, minor in devices
    )
    return device_count, max(memory for _, memory, _, _ in devices), summary


def main() -> int:
    try:
        details = cuda_details(_load_paddle())
    except UnsupportedCudaCapabilityError as error:
        print(f"error: {error}", file=sys.stderr)
        return 3
    except CudaDeviceUnavailableError as error:
        print(f"error: {error}", file=sys.stderr)
        return 4
    except Exception as error:
        print(f"error: could not inspect PaddleOCR CUDA support: {error}", file=sys.stderr)
        return 2

    if details is None:
        return 1

    device_count, max_memory_mib, summary = details
    print(f"{device_count}\t{max_memory_mib}\t{summary}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
