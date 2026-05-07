#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"

git -C "$repo_root" config core.hooksPath .githooks
chmod +x "$repo_root"/.githooks/* || true

echo "Configured git hooks path:"
git -C "$repo_root" config --get core.hooksPath
