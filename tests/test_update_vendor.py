"""Check licence preservation using controlled upstream archives."""

import io
import subprocess
import tarfile
import tempfile
import unittest
from collections.abc import Generator
from contextlib import contextmanager
from dataclasses import replace
from pathlib import Path
from typing import BinaryIO
from unittest.mock import patch

import update_vendor


@contextmanager
def upstream(files: dict[str, str]) -> Generator[None]:
    archive = io.BytesIO()
    with tarfile.open(fileobj=archive, mode="w:gz") as bundle:
        for name, text in files.items():
            content = text.encode()
            member = tarfile.TarInfo(f"upstream/{name}")
            member.size = len(content)
            bundle.addfile(member, io.BytesIO(content))

    def download(
        args: list[str], *, stdout: BinaryIO, **_options: object
    ) -> subprocess.CompletedProcess[bytes]:
        if args != [
            "gh",
            "api",
            f"repos/owner/example/tarball/{'a' * 40}",
        ]:
            raise AssertionError(f"Unexpected download: {args}")
        stdout.write(archive.getvalue())
        return subprocess.CompletedProcess(args, 0)

    with patch("update_vendor.subprocess.run", side_effect=download):
        yield


class VendorLicenses(unittest.TestCase):
    source: update_vendor.Source = update_vendor.Source(
        "example", "owner/example", "skills/example", "a" * 40, "MIT"
    )

    def test_nested_skill_includes_root_license_and_notice(self) -> None:
        with (
            tempfile.TemporaryDirectory() as directory,
            upstream(
                {
                    "skills/example/SKILL.md": "Original skill\n",
                    "LICENSE": "Upstream licence\n",
                    "NOTICE": "Upstream attribution\n",
                }
            ),
        ):
            staged = update_vendor.stage_skill(self.source, Path(directory))
            self.assertEqual((staged / "SKILL.md").read_text(), "Original skill\n")
            self.assertEqual((staged / "LICENSE").read_text(), "Upstream licence\n")
            self.assertEqual((staged / "NOTICE").read_text(), "Upstream attribution\n")

    def test_skill_specific_license_and_notice_take_precedence(self) -> None:
        with (
            tempfile.TemporaryDirectory() as directory,
            upstream(
                {
                    "skills/example/SKILL.md": "Original skill\n",
                    "skills/example/LICENSE": "Skill licence\n",
                    "skills/example/NOTICE": "Skill attribution\n",
                    "LICENSE": "Repository licence\n",
                    "NOTICE": "Repository attribution\n",
                }
            ),
        ):
            staged = update_vendor.stage_skill(self.source, Path(directory))
            self.assertEqual((staged / "LICENSE").read_text(), "Skill licence\n")
            self.assertEqual((staged / "NOTICE").read_text(), "Skill attribution\n")

    def test_root_skill_includes_notice(self) -> None:
        source = replace(self.source, path=".")
        with (
            tempfile.TemporaryDirectory() as directory,
            upstream(
                {
                    "SKILL.md": "Original skill\n",
                    "LICENSE": "Upstream licence\n",
                    "NOTICE": "Upstream attribution\n",
                }
            ),
        ):
            staged = update_vendor.stage_skill(source, Path(directory))
            self.assertEqual((staged / "NOTICE").read_text(), "Upstream attribution\n")

    def test_unchanged_pin_repairs_missing_license(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            vendor = Path(directory)
            sources = "# Pinned sources\n" + self.source.line()
            (vendor / "SOURCES").write_text(sources)
            skill = vendor / "example"
            skill.mkdir()
            (skill / "SKILL.md").write_text("Original skill\n")
            with (
                patch("update_vendor.latest_commit", return_value=self.source.commit),
                upstream(
                    {
                        "skills/example/SKILL.md": "Original skill\n",
                        "LICENSE": "Upstream licence\n",
                        "NOTICE": "Upstream attribution\n",
                    }
                ),
            ):
                update_vendor.update(vendor)
            self.assertEqual((skill / "LICENSE").read_text(), "Upstream licence\n")
            self.assertEqual((skill / "NOTICE").read_text(), "Upstream attribution\n")
            self.assertEqual((skill / "SKILL.md").read_text(), "Original skill\n")
            self.assertEqual((vendor / "SOURCES").read_text(), sources)
            with (
                patch("update_vendor.latest_commit", return_value=self.source.commit),
                patch("update_vendor.subprocess.run") as download,
            ):
                update_vendor.update(vendor)
            download.assert_not_called()

    def test_missing_upstream_license_leaves_installed_skill_untouched(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            vendor = Path(directory)
            sources = self.source.line()
            (vendor / "SOURCES").write_text(sources)
            skill = vendor / "example"
            skill.mkdir()
            (skill / "SKILL.md").write_text("Installed skill\n")
            with (
                patch("update_vendor.latest_commit", return_value=self.source.commit),
                upstream({"skills/example/SKILL.md": "Upstream skill\n"}),
                self.assertRaisesRegex(ValueError, "missing LICENSE"),
            ):
                update_vendor.update(vendor)
            self.assertEqual((skill / "SKILL.md").read_text(), "Installed skill\n")
            self.assertEqual((vendor / "SOURCES").read_text(), sources)
            self.assertFalse((skill / "LICENSE").exists())


if __name__ == "__main__":
    unittest.main()
