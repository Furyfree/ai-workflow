---
name: nix
description: Write, change, or review Nix - flake.nix, dev shells, packages, overlays, NixOS, nix-darwin and Home Manager. Use for "add a dev shell", "add a flake", "package this for Nix", "update this package", "is X in unstable yet", "where should this tool go", "tilføj en dev shell", "pak det til Nix", "opdater pakken", "er X kommet i unstable", "hvor skal værktøjet ligge". Not for running commands inside an existing dev shell or for diagnosing a running machine.
---

# Nix

The repository's AGENTS.md wins where it differs.

## Where a tool goes

- Nix (`~/Projects/nix`): system, desktop, services, drivers, GUI apps, and
  anything that needs root, system libraries, or rollback with a generation.
- Mise (`configs/mise` in that repo): CLI tools and runtimes kept at `latest`
  and updated more often than the system, the same on Linux and Mac. NixOS
  runs Mise's downloads through nix-ld. Never move these into Nix.
- A repo's dev shell: the tools its own checks need, pinned by its
  `flake.lock`.

## Facts

Never state versions or option names from memory.

- Version on a branch:
  `nix eval --refresh --raw github:NixOS/nixpkgs/<branch>#<pkg>.version`.
  For the pin, use the rev in `flake.lock` instead of the branch.
- Merged but not in the channel: find the nixpkgs PR with `gh`. Channels trail
  master by days.
- Options: search.nixos.org, Home Manager's option search, or the pinned
  source.

## Dev shells

- One `nixpkgs` input on `nixos-unstable` and `legacyPackages`; no
  flake-utils or flake-parts.
- `mkShellNoCC`; `mkShell` only when something compiles C.
- List the systems the repo runs on through `lib.genAttrs`.
- Tools in `packages`, plain variables in `env`. `shellHook` only for values
  that need the shell, such as `$HOME`.
- Python: uv, with `UV_PYTHON` from Nix and `UV_PYTHON_DOWNLOADS = "never"`.
  The language's own tool owns project dependencies and their lock file.
- Run checks as `nix develop --command just <recipe>`.

## Packages

Take the first that works:

1. The nixpkgs package.
2. `.override` for package options.
3. `.overrideAttrs` for version, source or patches.
4. An overlay, only when other packages must see the change.
5. Your own `stdenv.mkDerivation (finalAttrs: { ... })` from the upstream
   release, pinned by `hash`, with a comment saying how to update it.
6. A new flake input, only for a project maintained as a flake.

- Ahead of the channel: an overlay guarded by
  `lib.versionOlder prev.<pkg>.version "<version>"`, with a comment linking
  the nixpkgs PR, so it switches itself off.
- New hash: set `hash = lib.fakeHash;`, build, and copy the hash from the
  error. When `src` changes, update `cargoHash`, `vendorHash` or
  `npmDepsHash` too.
- Flakes ignore files Git does not track: `git add` new files first.

## NixOS, nix-darwin, Home Manager

- On NixOS, every system change goes through the nix repo and a rebuild.
  Never edit `/etc` or install system tools with `nix profile`.
- With `useGlobalPkgs = true`, overlays and unfree settings go in the
  system's `nixpkgs.*`; Home Manager's are ignored.
- Use an upstream option before your own module or a raw file.
- `mkDefault` and `mkForce` only to settle a real conflict.
- Settings that an app or I edit live: `mkOutOfStoreSymlink` with an absolute
  path into the checkout, never a `./path` literal.
- Never raise `stateVersion` as part of an upgrade.
- On nixos-unstable, removed options fail evaluation. When a build breaks
  after an update, read the release notes.

## Verify

Build; never activate unless asked.

- NixOS: `nix build .#nixosConfigurations.<host>.config.system.build.toplevel`
- Mac: `nix build .#darwinConfigurations.<host>.system`; `nix flake check`
  skips it.
- Then the repo's gate, such as `just check`. A build does not prove boot,
  login, sleep or rollback; say what needs a machine check.
