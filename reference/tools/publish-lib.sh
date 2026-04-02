#!/usr/bin/env bash
# publish-lib.sh — Automate lib publishing steps
# Usage: bash tools/publish-lib.sh <command> <lib-name>
# Commands: alpha | release | merge | update
set -e

WORKSPACE_ROOT=$(cd "$(dirname "$0")/.." && pwd)
CMD="$1"
LIB_NAME="$2"

if [ -z "$CMD" ] || [ -z "$LIB_NAME" ]; then
  echo "Usage: bash tools/publish-lib.sh <alpha|release|merge|update> <lib-name>"
  exit 1
fi

LIB_DIR="$WORKSPACE_ROOT/libs/$LIB_NAME"

if [ ! -d "$LIB_DIR" ]; then
  echo "Error: '$LIB_DIR' does not exist."
  exit 1
fi

case "$CMD" in

  alpha)
    echo "── Alpha release for $LIB_NAME ──"
    cd "$LIB_DIR"
    git checkout -b release
    npx standard-version --prerelease alpha
    git push origin release --follow-tags
    echo "✅ Alpha pushed. Wait for CI to pass before running 'release'."
    ;;

  release)
    echo "── Official release for $LIB_NAME ──"
    cd "$LIB_DIR"
    git checkout release
    npx standard-version
    git push origin release --follow-tags
    echo "✅ Release pushed. Wait for CI to pass before running 'merge'."
    ;;

  merge)
    echo "── Merge & cleanup for $LIB_NAME ──"
    cd "$LIB_DIR"
    git checkout master
    git merge release
    git push origin master
    git branch -d release
    git push origin --delete release
    echo "✅ Merged to master, release branch deleted."
    ;;

  update)
    echo "── Update workspace for $LIB_NAME ──"
    cd "$LIB_DIR"
    VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "unknown")
    cd "$WORKSPACE_ROOT"

    # Append to RELEASES.md
    DATE=$(date +%Y-%m-%d)
    echo "| @thanh-libs/$LIB_NAME | $VERSION | $DATE |" >> RELEASES.md

    git add "libs/$LIB_NAME" RELEASES.md
    git commit -m "chore: update $LIB_NAME submodule to $VERSION"
    git push
    echo "✅ Workspace updated with $LIB_NAME $VERSION."
    ;;

  *)
    echo "Unknown command: $CMD"
    echo "Usage: bash tools/publish-lib.sh <alpha|release|merge|update> <lib-name>"
    exit 1
    ;;
esac
