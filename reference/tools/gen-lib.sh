#!/usr/bin/env bash
# gen-lib.sh — Quickly scaffold a React library
set -e

if [ -z "$1" ]; then
  echo "Error: Please provide a library name. (Usage: yarn gen-lib <name>)"
  exit 1
fi

LIB_NAME="$1"
IMPORT_PATH="@thanh-libs/${LIB_NAME}"
LIB_DIR="libs/${LIB_NAME}"
TEMPLATE_DIR="tools/templates"

if [ -d "$LIB_DIR" ]; then echo "Error: Library '${LIB_NAME}' already exists at ${LIB_DIR}"; exit 1; fi
if [ ! -d "$TEMPLATE_DIR" ]; then echo "Error: Templates directory '${TEMPLATE_DIR}' not found"; exit 1; fi

npx nx generate @nx/react:library "${LIB_NAME}" \
  --directory="${LIB_DIR}" --bundler=vite --unitTestRunner=vitest \
  --style=@emotion/styled --component=true --publishable \
  --importPath="${IMPORT_PATH}" --no-interactive

npx nx generate @nx/react:storybook-configuration "${IMPORT_PATH}" --no-interactive

mkdir -p "${LIB_DIR}/.storybook"
cp "${TEMPLATE_DIR}/.storybook/preview.ts" "${LIB_DIR}/.storybook/preview.ts"
cp "${TEMPLATE_DIR}/.gitignore" "${LIB_DIR}/.gitignore"


for tc in tsconfig.json tsconfig.lib.json tsconfig.spec.json tsconfig.storybook.json; do
  cp "${TEMPLATE_DIR}/${tc}" "${LIB_DIR}/${tc}"
done

mkdir -p "${LIB_DIR}/.github/workflows"
cp "${TEMPLATE_DIR}/publish.yml" "${LIB_DIR}/.github/workflows/publish.yml"

cp "${TEMPLATE_DIR}/package.json" "${LIB_DIR}/package.json"
sed -i "s/{{LIB_NAME}}/${LIB_NAME}/g" "${LIB_DIR}/package.json"

cp "${TEMPLATE_DIR}/vite.config.mts" "${LIB_DIR}/vite.config.mts"
sed -i "s/{{LIB_NAME}}/${LIB_NAME}/g" "${LIB_DIR}/vite.config.mts"

cp LICENSE "${LIB_DIR}/LICENSE"

# Setup Test & Check Deps
mkdir -p "${LIB_DIR}/tests"
cp "${TEMPLATE_DIR}/tests/setup.ts" "${LIB_DIR}/tests/setup.ts"
cp "${TEMPLATE_DIR}/check-deps.mjs" "${LIB_DIR}/check-deps.mjs"

# Setup Storybook Stories
mkdir -p "${LIB_DIR}/src/lib/stories"
cp "${TEMPLATE_DIR}/stories/template.stories.tsx" "${LIB_DIR}/src/lib/stories/${LIB_NAME}.stories.tsx"
sed -i "s/{{LIB_NAME}}/${LIB_NAME}/g" "${LIB_DIR}/src/lib/stories/${LIB_NAME}.stories.tsx"


# Verify
MISSING=0
for f in tsconfig.json tsconfig.lib.json tsconfig.spec.json tsconfig.storybook.json vite.config.mts package.json LICENSE .gitignore .github/workflows/publish.yml .storybook/preview.ts; do
  if [ ! -f "${LIB_DIR}/${f}" ]; then MISSING=1; fi
done

if [ $MISSING -eq 0 ]; then
  echo "Library '${LIB_NAME}' created successfully!"
else
  echo "Library created, but some template files are missing."
fi
