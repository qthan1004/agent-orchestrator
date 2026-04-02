#!/usr/bin/env bash
# git-push.sh — Unified push script for workspace and lib submodules
# Usage:
#   bash tools/git-push.sh "<commit-message>"               # workspace only
#   bash tools/git-push.sh "<commit-message>" <lib-name>     # single lib + workspace ref
#   bash tools/git-push.sh "<commit-message>" --all          # all libs + workspace ref
set -e

WORKSPACE_ROOT=$(cd "$(dirname "$0")/.." && pwd)
MSG="$1"
TARGET="$2"  # lib-name | --all | empty

# ── Helpers ──
ok()   { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }
quiet_push() {
  local output
  if ! output=$(git push origin "$(git rev-parse --abbrev-ref HEAD)" 2>&1); then
    echo "$output"
    fail "Push failed"
  fi
}
commit_if_dirty() {
  local msg="$1"
  git add . > /dev/null 2>&1
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit -m "$msg" --quiet
    return 0
  fi
  return 1
}

# ── Validate ──
[ -z "$MSG" ] && fail "Usage: bash tools/git-push.sh \"<message>\" [lib-name|--all]"

push_lib() {
  local lib="$1" lib_dir="$WORKSPACE_ROOT/libs/$lib"
  [ ! -d "$lib_dir" ] && fail "Lib '$lib' not found at $lib_dir"

  cd "$lib_dir"
  commit_if_dirty "$MSG" || true
  quiet_push
  ok "$lib pushed"
}

update_workspace_ref() {
  cd "$WORKSPACE_ROOT"
  git add libs/ > /dev/null 2>&1
  if ! git diff --cached --quiet 2>/dev/null; then
    git commit -m "chore: update submodule refs" --quiet
    quiet_push
    ok "Workspace ref updated"
  fi
}

# ── Main ──
if [ "$TARGET" = "--all" ]; then
  # Push all libs
  for dir in "$WORKSPACE_ROOT"/libs/*/; do
    [ ! -e "$dir/.git" ] && continue
    push_lib "$(basename "$dir")"
  done
  update_workspace_ref

elif [ -n "$TARGET" ]; then
  # Push single lib
  push_lib "$TARGET"
  update_workspace_ref

else
  # Workspace only
  cd "$WORKSPACE_ROOT"
  if ! commit_if_dirty "$MSG"; then
    echo "Nothing to commit"
    exit 0
  fi
  quiet_push
  ok "Workspace pushed"
fi
