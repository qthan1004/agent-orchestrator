#!/usr/bin/env bash
# git-setup-lib.sh — Create GitHub repo, init git, register submodule
set -e

if [ -z "$1" ]; then
  echo "Usage: bash tools/git-setup-lib.sh <lib-name>"
  exit 1
fi

LIB_NAME="$1"
LIB_DIR="libs/${LIB_NAME}"

if [ ! -d "$LIB_DIR" ]; then
  echo "Error: Library directory '${LIB_DIR}' does not exist. Run gen-lib.sh first."
  exit 1
fi

# Detect protocol from existing .gitmodules
SAMPLE_URL=$(grep 'url = ' .gitmodules | head -1 | awk '{print $3}')
if echo "$SAMPLE_URL" | grep -q "^git@"; then
  PROTOCOL_URL="git@github.com:system-core-ui/${LIB_NAME}.git"
else
  PROTOCOL_URL="https://github.com/system-core-ui/${LIB_NAME}.git"
fi

echo "Detected protocol → ${PROTOCOL_URL}"

# 1. Create GitHub repo
gh repo create "system-core-ui/${LIB_NAME}" --public --confirm

# 2. Init git inside the lib
cd "$LIB_DIR"
git init
git remote add origin "$PROTOCOL_URL"
git checkout -b master
git add .
git commit -m "feat: initial scaffold for @thanh-libs/${LIB_NAME}"
git push -u origin master
cd ../..

# 3. Register as submodule in workspace
git submodule add "$PROTOCOL_URL" "$LIB_DIR"
git add .
git commit -m "chore: add ${LIB_NAME} submodule"
git push

echo "✅ GitHub repo created & submodule registered for '${LIB_NAME}'"
