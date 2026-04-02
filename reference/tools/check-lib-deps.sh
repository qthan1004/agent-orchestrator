#!/bin/bash
# check-lib-deps.sh — Verify a lib has all required dependencies in its package.json
set -e

if [ -z "$1" ]; then
  echo "Error: Please provide a library name. (Usage: bash tools/check-lib-deps.sh <lib-name>)"
  exit 1
fi

LIB_NAME="$1"
LIB_DIR="libs/${LIB_NAME}"

if [ ! -d "$LIB_DIR" ]; then echo "Error: Library '${LIB_NAME}' not found at ${LIB_DIR}"; exit 1; fi
PKG="$LIB_DIR/package.json"

DECLARED_DEPS=$(node -e "
  const pkg = require('./${PKG}');
  const all = { ...pkg.dependencies, ...pkg.peerDependencies, ...pkg.devDependencies };
  console.log(Object.keys(all).join('\n'));
" 2>/dev/null || echo "")

IMPORTED_PKGS=$(grep -rhoE "(from|import|require\()\s*['\"]([^'\"./][^'\"]*)['\"]" \
  "$LIB_DIR/src" "$LIB_DIR/tests" 2>/dev/null \
  --include='*.ts' --include='*.tsx' --exclude='*.stories.*' \
  | grep -oE "['\"][^'\"]+['\"]" | tr -d "'\"" \
  | sed 's|/jsx-runtime$||; s|/jsx-dev-runtime$||' | sort -u)

normalize_pkg() {
  local imp="$1"
  if [[ "$imp" == @* ]]; then echo "$imp" | cut -d'/' -f1,2; else echo "$imp" | cut -d'/' -f1; fi
}

MISSING=()
CHECKED=()

for imp in $IMPORTED_PKGS; do
  pkg=$(normalize_pkg "$imp")
  case "$pkg" in
    react/jsx-runtime|react/jsx-dev-runtime) continue ;;
    path|fs|os|url|util|events|stream|crypto|http|https|net|child_process|assert|buffer|querystring|string_decoder|timers|tty|zlib|module|process) continue ;;
    node:*) continue ;;
  esac

  if [[ " ${CHECKED[*]} " =~ " ${pkg} " ]]; then continue; fi
  CHECKED+=("$pkg")

  if ! echo "$DECLARED_DEPS" | grep -qx "$pkg"; then MISSING+=("$pkg"); fi
done

if [ ${#MISSING[@]} -eq 0 ]; then
  exit 0
else
  echo "Missing ${#MISSING[@]} package(s) in ${PKG}:"
  for pkg in "${MISSING[@]}"; do
    FILES=$(grep -rl "from ['\"]${pkg}" "$LIB_DIR/src" "$LIB_DIR/tests" 2>/dev/null | head -3 | sed "s|${LIB_DIR}/||g" | tr '\n' ', ' | sed 's/,$//')
    echo "  - ${pkg} (used in: ${FILES})"
  done
  exit 1
fi
