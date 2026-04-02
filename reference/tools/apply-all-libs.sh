#!/usr/bin/env bash
# apply-all-libs.sh — Run commands or sync files across all lib directories
# Usage:
#   bash tools/apply-all-libs.sh run   '<command>'           # exec in each lib (fails on error)
#   bash tools/apply-all-libs.sh check '<command>'           # exec in each lib (continues on error)
#   bash tools/apply-all-libs.sh sync  <source> [dest-name]  # copy file to each lib
set -e

WORKSPACE_ROOT=$(cd "$(dirname "$0")/.." && pwd)
ACTION="$1"; shift || true

case "$ACTION" in
  run)
    CMD="$1"
    [ -z "$CMD" ] && echo "Usage: bash tools/apply-all-libs.sh run '<command>'" && exit 1
    for dir in "$WORKSPACE_ROOT"/libs/*/; do
      echo "──── $(basename "$dir") ────"
      cd "$dir" && eval "$CMD"
    done
    echo "✅ Applied to all libs!"
    ;;

  check)
    CMD="$1"
    [ -z "$CMD" ] && echo "Usage: bash tools/apply-all-libs.sh check '<command>'" && exit 1
    for dir in "$WORKSPACE_ROOT"/libs/*/; do
      echo "──── $(basename "$dir") ────"
      cd "$dir" && eval "$CMD" 2>&1 || true
      echo ""
    done
    ;;

  sync)
    SRC="$1"; DEST="${2:-$(basename "$SRC")}"
    [ -z "$SRC" ] && echo "Usage: bash tools/apply-all-libs.sh sync <source> [dest]" && exit 1
    [ ! -f "$SRC" ] && echo "Error: '$SRC' not found" && exit 1
    for dir in "$WORKSPACE_ROOT"/libs/*/; do
      mkdir -p "$(dirname "$dir/$DEST")"
      echo "──── $(basename "$dir") ──── → $DEST"
      cp "$SRC" "$dir/$DEST"
    done
    echo "✅ Synced '$DEST' to all libs!"
    ;;

  *)
    cat <<EOF
Usage: bash tools/apply-all-libs.sh <run|check|sync> [args...]

Commands:
  run   '<cmd>'             Run command in each lib (stops on error)
  check '<cmd>'             Run command in each lib (continues on error)
  sync  <source> [dest]     Copy a file into every lib directory
EOF
    exit 1
    ;;
esac
