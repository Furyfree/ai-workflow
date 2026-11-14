---
name: linux
description: Work on Linux machines - services, boot, networking, desktop, disks, logs and installs. Use for "why does X not start", "the wifi drops", "set up a service", "install X", "start it at login", "why is boot slow", "hvorfor starter X ikke", "wifi'en falder ud", "installer X", "start det ved login". Not for macOS or for writing Nix (use nix).
---

# Linux

## Change machines the way they are managed

- If a config tool manages the machine (NixOS, Ansible, Talos, cloud-init),
  change it there. A hand edit is lost on the next run.
- Otherwise use the distro's tools: its package manager, drop-in files in
  `/etc/<tool>.d/`, and `systemctl edit <unit>` instead of editing vendor
  files under `/usr`.
- Over SSH, look first. Change a remote machine through its config tool.
- Before a risky change, take a snapshot if the system has them (snapper,
  btrfs, a VM snapshot).

## Diagnose first

- What failed: `systemctl --failed`, `systemctl status <unit>`,
  `journalctl -b -u <unit>`. Add `--user` for session services.
- Warnings this boot: `journalctl -b -p warning`. Last boot:
  `journalctl -b -1`.
- Slow boot: `systemd-analyze blame` and `systemd-analyze critical-chain`.
- Hardware and drivers: `journalctl -k`, `lspci -k`, `lsusb`.
- Network: `ip addr`, `ip route`, `nmcli`, `resolvectl status`.
- Disks: `lsblk -f`, `findmnt`, `df -h`.
- Find the cause before changing anything.

## Services and startup

- systemd services and timers, not cron or shell autostart scripts.
- Desktop parts run as user services tied to `graphical-session.target`.
- Under a session manager such as UWSM, start apps through it
  (`uwsm app -- <command>`) so they join the session.

## Installing software

Take the first that works:

1. The distro's own packages (apt, dnf, pacman, nixpkgs and so on).
2. What the creators distribute themselves, in the form they offer: an
   install script such as Zed's `curl -f https://zed.dev/install.sh | sh`,
   an AppImage, or a .deb or .rpm, repackaged for the distro if needed.
   Take the link from the project's own site or repository.
3. A third-party source the creators point to, such as the Copr repository
   Hyprland's wiki names for Fedora. Say it is community-maintained.
4. Flathub, for a GUI app that needs few permissions. A "verified" app on
   Flathub is published by its creators, so it counts as step 2.

Anything else (a mirror, a PPA or a repository the creators do not mention):
warn me and wait for my answer before using it.

## Files

- XDG folders: settings in `~/.config`, state in `~/.local/state`, caches in
  `~/.cache`, data in `~/.local/share`. Nothing loose in home.
- Each app keeps its settings in its own format. Runtime state, caches and
  secrets stay out of Git.
