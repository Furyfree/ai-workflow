#!/usr/bin/env python3
"""Tests for check_paddle_cuda.py without requiring PaddlePaddle or a GPU."""

from __future__ import annotations

import contextlib
import io
import types
import unittest
from unittest import mock

import check_paddle_cuda


class FakeCuda:
    def __init__(self, devices: list[tuple[str, int, tuple[int, int]]]) -> None:
        self.devices = devices

    def device_count(self) -> int:
        return len(self.devices)

    def get_device_name(self, index: int) -> str:
        return self.devices[index][0]

    def get_device_properties(self, index: int) -> types.SimpleNamespace:
        return types.SimpleNamespace(total_memory=self.devices[index][1])

    def get_device_capability(self, index: int) -> tuple[int, int]:
        return self.devices[index][2]


class FakeDevice:
    def __init__(
        self,
        devices: list[tuple[str, int, tuple[int, int]]],
        *,
        compiled_with_cuda: bool = True,
    ) -> None:
        self.cuda = FakeCuda(devices)
        self.compiled_with_cuda = compiled_with_cuda

    def is_compiled_with_cuda(self) -> bool:
        return self.compiled_with_cuda


class CheckPaddleCudaTests(unittest.TestCase):
    def run_main(self, fake_paddle: object) -> tuple[int, str, str]:
        stdout = io.StringIO()
        stderr = io.StringIO()
        with (
            mock.patch.object(
                check_paddle_cuda,
                "_load_paddle",
                return_value=fake_paddle,
            ),
            contextlib.redirect_stdout(stdout),
            contextlib.redirect_stderr(stderr),
        ):
            status = check_paddle_cuda.main()
        return status, stdout.getvalue(), stderr.getvalue()

    def test_reports_cuda_devices_as_tsv(self) -> None:
        fake_paddle = types.SimpleNamespace(
            device=FakeDevice(
                [
                    ("NVIDIA GeForce RTX 3080", 10 * 1024 * 1024 * 1024, (8, 6)),
                    ("GPU\tTwo", 16 * 1024 * 1024 * 1024, (9, 0)),
                ]
            )
        )

        status, stdout, stderr = self.run_main(fake_paddle)

        self.assertEqual(status, 0)
        self.assertEqual(
            stdout,
            "2\t16384\tNVIDIA GeForce RTX 3080 (10240 MiB, compute 8.6); "
            "GPU Two (16384 MiB, compute 9.0)\n",
        )
        self.assertEqual(stderr, "")

    def test_returns_one_for_cpu_build(self) -> None:
        fake_paddle = types.SimpleNamespace(
            device=FakeDevice([], compiled_with_cuda=False)
        )

        status, stdout, stderr = self.run_main(fake_paddle)

        self.assertEqual(status, 1)
        self.assertEqual(stdout, "")
        self.assertEqual(stderr, "")

    def test_returns_three_for_unsupported_gpu_zero(self) -> None:
        fake_paddle = types.SimpleNamespace(
            device=FakeDevice([("Older GPU", 8 * 1024 * 1024 * 1024, (6, 1))])
        )

        status, stdout, stderr = self.run_main(fake_paddle)

        self.assertEqual(status, 3)
        self.assertEqual(stdout, "")
        self.assertIn("compute capability 6.1", stderr)

    def test_returns_four_when_cuda_build_has_no_visible_devices(self) -> None:
        fake_paddle = types.SimpleNamespace(device=FakeDevice([]))

        status, stdout, stderr = self.run_main(fake_paddle)

        self.assertEqual(status, 4)
        self.assertEqual(stdout, "")
        self.assertIn("CUDA build has no visible NVIDIA devices", stderr)

    def test_returns_two_when_cuda_query_fails(self) -> None:
        with mock.patch.object(
            check_paddle_cuda,
            "_load_paddle",
            side_effect=ValueError("unexpected CUDA response"),
        ):
            stderr = io.StringIO()
            with contextlib.redirect_stderr(stderr):
                status = check_paddle_cuda.main()

        self.assertEqual(status, 2)
        self.assertIn("could not inspect PaddleOCR CUDA support", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
