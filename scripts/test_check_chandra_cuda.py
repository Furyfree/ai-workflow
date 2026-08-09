#!/usr/bin/env python3
"""Tests for check_chandra_cuda.py without requiring Torch or a GPU."""

from __future__ import annotations

import contextlib
import io
import types
import unittest
from unittest import mock

import check_chandra_cuda


class FakeCuda:
    def __init__(
        self,
        devices: list[tuple[str, int]],
        *,
        available: bool = True,
    ) -> None:
        self.devices = devices
        self.available = available

    def is_available(self) -> bool:
        return self.available

    def device_count(self) -> int:
        return len(self.devices)

    def get_device_name(self, index: int) -> str:
        return self.devices[index][0]

    def get_device_properties(self, index: int) -> types.SimpleNamespace:
        return types.SimpleNamespace(total_memory=self.devices[index][1])


class CheckChandraCudaTests(unittest.TestCase):
    def run_main(self, fake_torch: object) -> tuple[int, str, str]:
        stdout = io.StringIO()
        stderr = io.StringIO()
        with (
            mock.patch.object(
                check_chandra_cuda,
                "_load_torch",
                return_value=fake_torch,
            ),
            contextlib.redirect_stdout(stdout),
            contextlib.redirect_stderr(stderr),
        ):
            status = check_chandra_cuda.main()
        return status, stdout.getvalue(), stderr.getvalue()

    def test_reports_cuda_devices_as_tsv(self) -> None:
        fake_torch = types.SimpleNamespace(
            cuda=FakeCuda(
                [
                    ("NVIDIA GeForce RTX 3080", 10 * 1024 * 1024 * 1024),
                    ("GPU\tTwo", 16 * 1024 * 1024 * 1024),
                ]
            )
        )

        status, stdout, stderr = self.run_main(fake_torch)

        self.assertEqual(status, 0)
        self.assertEqual(
            stdout,
            "2\t16384\tNVIDIA GeForce RTX 3080 (10240 MiB); "
            "GPU Two (16384 MiB)\n",
        )
        self.assertEqual(stderr, "")

    def test_returns_one_when_cuda_is_unavailable(self) -> None:
        fake_torch = types.SimpleNamespace(cuda=FakeCuda([], available=False))

        status, stdout, stderr = self.run_main(fake_torch)

        self.assertEqual(status, 1)
        self.assertEqual(stdout, "")
        self.assertEqual(stderr, "")

    def test_returns_two_when_cuda_query_fails(self) -> None:
        with mock.patch.object(
            check_chandra_cuda,
            "_load_torch",
            side_effect=ValueError("unexpected CUDA response"),
        ):
            stderr = io.StringIO()
            with contextlib.redirect_stderr(stderr):
                status = check_chandra_cuda.main()

        self.assertEqual(status, 2)
        self.assertIn("could not inspect Chandra CUDA support", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
