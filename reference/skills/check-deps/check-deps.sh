#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# check-deps.sh — Detect missing @thanh-libs/* dependency declarations
#
# Usage:  bash check-deps.sh [workspace_root]
#   workspace_root defaults to the script's grandparent directory
#
# Output: For each lib, lists imports vs declared deps.
#         EXIT 1 if any mismatch found, EXIT 0 if clean.
# ──────────────────────────────────────────────────────────────

set -euo pipefail

# Resolve workspace root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE="${1:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"
LIBS_DIR="$WORKSPACE/libs"

if [ ! -d "$LIBS_DIR" ]; then
  echo "❌ libs/ directory not found at: $LIBS_DIR"
  exit 1
fi

HAS_ERROR=0

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  @thanh-libs/* Dependency Check"
echo "  Workspace: $WORKSPACE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for lib_dir in "$LIBS_DIR"/*/; do
  lib_name=$(basename "$lib_dir")
  pkg_file="$lib_dir/package.json"
  src_dir="$lib_dir/src"

  # Skip if no package.json or no src/
  [ -f "$pkg_file" ] || continue
  [ -d "$src_dir" ] || continue

  # Find all @thanh-libs/* imports in source files (excluding self)
  imported=$(
    grep -rh --include='*.ts' --include='*.tsx' \
      "from '@thanh-libs/" "$src_dir" 2>/dev/null \
    | grep -oP "@thanh-libs/[a-z0-9-]+" \
    | sort -u \
    | grep -v "@thanh-libs/$lib_name" \
    || true
  )

  # Skip libs with no @thanh-libs imports
  [ -z "$imported" ] && continue

  # Get declared deps from package.json (peer + dev + regular dependencies)
  declared=$(
    node -e "
      const pkg = require('$pkg_file');
      const all = {
        ...pkg.dependencies,
        ...pkg.peerDependencies,
        ...pkg.devDependencies
      };
      Object.keys(all)
        .filter(k => k.startsWith('@thanh-libs/'))
        .sort()
        .forEach(k => console.log(k));
    " 2>/dev/null || true
  )

  # Compare: find imports not in declared
  missing=""
  while IFS= read -r imp; do
    [ -z "$imp" ] && continue
    if ! echo "$declared" | grep -qx "$imp"; then
      missing="${missing}    ❌ ${imp} — imported but NOT in package.json\n"
    fi
  done <<< "$imported"

  # Also check: declared as fixed version (not "*") for internal deps
  version_issues=""
  while IFS= read -r dep; do
    [ -z "$dep" ] && continue
    ver=$(node -e "
      const pkg = require('$pkg_file');
      const v = (pkg.peerDependencies || {})['$dep']
             || (pkg.dependencies || {})['$dep']
             || '';
      console.log(v);
    " 2>/dev/null || true)
    if [ -n "$ver" ] && [ "$ver" != "*" ]; then
      version_issues="${version_issues}    ⚠️  ${dep}: \"${ver}\" — should be \"*\" for internal\n"
    fi
  done <<< "$(echo "$declared" | grep '@thanh-libs/' || true)"

  # Report
  if [ -n "$missing" ] || [ -n "$version_issues" ]; then
    echo "📦 $lib_name"
    echo "   imports: $(echo "$imported" | tr '\n' ' ')"
    echo "   declared: $(echo "$declared" | tr '\n' ' ')"
    [ -n "$missing" ] && echo -e "$missing"
    [ -n "$version_issues" ] && echo -e "$version_issues"
    HAS_ERROR=1
  fi
done

echo ""
if [ "$HAS_ERROR" -eq 0 ]; then
  echo "✅ All dependency declarations are correct!"
else
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  ⚠️  Mismatches found! Fix package.json files."
  echo "  Convention: peerDependencies + devDependencies with \"*\""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

exit $HAS_ERROR
