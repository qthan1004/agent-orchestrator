---
description: Clear internal Nexus registry URLs from all files to enable local public npm install
---

This workflow is used when switching from the company environment (which uses the internal Nexus registry `nexus.digi-texx.vn`) to the local/public environment, where that registry cannot be accessed.

It scans all files in the project (including hidden files like `.npmrc` and lockfiles) and replaces the internal Nexus registry URLs with the public `registry.npmjs.org`.

## Execution

1. Run the clear script that scans and replaces Nexus URLs across the workspace:

```bash
// turbo
bash ./tools/clear-nexus.sh
```

2. (Optional) Run install to ensure lockfiles are fully re-resolved with the public registry:

```bash
# yarn install
# npm install
```
