"""Check that the installer links, backs up, and removes only what it owns."""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from dataclasses import dataclass
from pathlib import Path

INSTALLER = Path(__file__).resolve().parents[1] / "install.py"


@dataclass(frozen=True)
class Sandbox:
    root: Path
    repo: Path
    home: Path
    bin: Path
    calls: Path

    def tool(self, name: str, body: str = "") -> None:
        path = self.bin / name
        path.write_text(f"#!/bin/sh\n{body}\n")
        path.chmod(0o755)

    def install(self, *flags: str) -> str:
        return subprocess.run(
            [sys.executable, self.repo / "install.py", *flags],
            env={
                "HOME": str(self.home),
                "PATH": str(self.bin),
                "CALLS": str(self.calls),
            },
            check=True,
            capture_output=True,
            text=True,
            timeout=30,
        ).stdout

    def links(self) -> dict[str, Path]:
        return {
            str(path.relative_to(self.home)): path.readlink()
            for path in self.home.rglob("*")
            if path.is_symlink()
        }

    def recorded(self) -> list[str]:
        return self.calls.read_text().splitlines() if self.calls.exists() else []


def sandbox(test: unittest.TestCase) -> Sandbox:
    root = Path(tempfile.mkdtemp()).resolve()
    test.addCleanup(shutil.rmtree, root)
    box = Sandbox(root, root / "repo", root / "home", root / "bin", root / "calls")
    files = {
        "rules.md": "rules\n",
        # alpha wraps vendor/gamma and replaces vendor/alpha.
        "skills/alpha/SKILL.md": "Read ../../vendor/gamma/SKILL.md\n",
        "vendor/alpha/SKILL.md": "upstream alpha\n",
        "vendor/beta/SKILL.md": "beta\n",
        "vendor/gamma/SKILL.md": "gamma\n",
        "extensions/x.ts": "export {};\n",
    }
    for name, text in files.items():
        path = box.repo / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    shutil.copy(INSTALLER, box.repo / "install.py")
    for agent in (".claude", ".codex", ".pi/agent"):
        (box.home / agent).mkdir(parents=True)
    # A fake claude records its arguments; PATH holds nothing else.
    box.bin.mkdir()
    box.tool("claude", 'printf "%s\\n" "$*" >> "$CALLS"')
    return box


class InstallTest(unittest.TestCase):
    def test_install_links_only_active_sources_and_repeats_cleanly(self) -> None:
        box = sandbox(self)
        expected = {
            ".claude/CLAUDE.md": box.repo / "rules.md",
            ".codex/AGENTS.md": box.repo / "rules.md",
            ".pi/agent/AGENTS.md": box.repo / "rules.md",
            ".agents/skills/alpha": box.repo / "skills/alpha",
            ".claude/skills/alpha": box.repo / "skills/alpha",
            ".agents/skills/beta": box.repo / "vendor/beta",
            ".claude/skills/beta": box.repo / "vendor/beta",
            ".pi/agent/extensions/x.ts": box.repo / "extensions/x.ts",
        }
        box.install()
        self.assertEqual(box.links(), expected)
        self.assertNotIn("linked:", box.install())
        self.assertEqual(box.links(), expected)
        self.assertFalse((box.home / ".config").exists())
        self.assertFalse((box.home / ".local/state/ai-workflow-backup").exists())

    def test_real_files_stay_without_force_and_are_backed_up_with_force(self) -> None:
        box = sandbox(self)
        rules = box.home / ".claude/CLAUDE.md"
        rules.write_text("mine\n")
        skill = box.home / ".agents/skills/alpha"
        skill.mkdir(parents=True)
        (skill / "SKILL.md").write_text("my skill\n")

        box.install()
        self.assertEqual(rules.read_text(), "mine\n")
        self.assertEqual((skill / "SKILL.md").read_text(), "my skill\n")
        self.assertFalse(rules.is_symlink() or skill.is_symlink())

        box.install("--force")
        self.assertEqual(rules.readlink(), box.repo / "rules.md")
        self.assertEqual(skill.readlink(), box.repo / "skills/alpha")
        backups = box.home / ".local/state/ai-workflow-backup"
        [saved_rules] = backups.glob("*/.claude/CLAUDE.md")
        [saved_skill] = backups.glob("*/.agents/skills/alpha/SKILL.md")
        self.assertEqual(saved_rules.read_text(), "mine\n")
        self.assertEqual(saved_skill.read_text(), "my skill\n")

    def test_uninstall_removes_only_our_links(self) -> None:
        box = sandbox(self)
        box.install()
        elsewhere = box.root / "elsewhere"
        elsewhere.mkdir()
        replaced = box.home / ".claude/skills/alpha"
        replaced.unlink()
        replaced.symlink_to(elsewhere)

        box.install("--uninstall")
        self.assertEqual(box.links(), {".claude/skills/alpha": elsewhere})

    def test_links_to_deleted_sources_are_pruned(self) -> None:
        box = sandbox(self)
        box.install()
        foreign = box.home / ".agents/skills/old"
        foreign.symlink_to(box.root / "gone")
        shutil.rmtree(box.repo / "vendor/beta")

        box.install()
        self.assertFalse((box.home / ".agents/skills/beta").is_symlink())
        self.assertFalse((box.home / ".claude/skills/beta").is_symlink())
        self.assertTrue(foreign.is_symlink())

    def test_claude_mcp_changes_only_our_servers(self) -> None:
        box = sandbox(self)
        box.tool("computer-use-linux")
        state = box.home / ".claude.json"
        foreign = {"agent-workspace-linux": {"command": "/opt/other"}}
        state.write_text(json.dumps({"mcpServers": foreign}))

        box.install()
        self.assertEqual(
            box.recorded(),
            ["mcp add -s user computer-use-linux -- computer-use-linux mcp"],
        )

        box.calls.unlink()
        ours = {"computer-use-linux": {"command": "computer-use-linux"}}
        state.write_text(json.dumps({"mcpServers": ours | foreign}))
        box.install("--uninstall")
        self.assertEqual(box.recorded(), ["mcp remove -s user computer-use-linux"])


if __name__ == "__main__":
    unittest.main()
