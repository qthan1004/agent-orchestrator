#!/usr/bin/env bash
# git-push.sh — Simple git add + commit + push
# Usage:
#   bash tools/git-push.sh "<commit-message>"
set -e

WORKSPACE_ROOT=$(cd "$(dirname "$0")/.." && pwd)
MSG="$1"

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
[ -z "$MSG" ] && fail "Usage: bash tools/git-push.sh \"<message>\""

# ── Main ──
cd "$WORKSPACE_ROOT"
if ! commit_if_dirty "$MSG"; then
  echo "Nothing to commit"
  exit 0
fi
quiet_push
ok "Pushed: $MSG"
