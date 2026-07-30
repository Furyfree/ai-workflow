#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
container_command="${CONTAINER_COMMAND:-}"

if [[ -z "$container_command" ]]; then
  if command -v podman >/dev/null 2>&1; then
    container_command="podman"
  elif command -v docker >/dev/null 2>&1; then
    container_command="docker"
  else
    printf 'error: neither Podman nor Docker is available\n' >&2
    exit 1
  fi
fi

if (($#)); then
  distros=("$@")
else
  distros=(ubuntu debian fedora)
fi

for distro in "${distros[@]}"; do
  dockerfile="$repo_root/containers/$distro.Dockerfile"
  [[ -f "$dockerfile" ]] || {
    printf 'error: unsupported distribution: %s\n' "$distro" >&2
    exit 2
  }
  tag="ai-workflow-validation:$distro"
  printf 'building %s with %s\n' "$distro" "$container_command"
  "$container_command" build \
    --file "$dockerfile" \
    --tag "$tag" \
    "$repo_root"
  "$container_command" run --rm "$tag"
done

printf 'container validation passed: %s\n' "${distros[*]}"
