---
description: Git commit and push — workspace, single lib, or all libs
---

// turbo-all

# Git Push

Unified push workflow. Pick the right form:

### Workspace only (no submodule)
```bash
bash tools/git-push.sh "<type>(<scope>): <subject>"
```

### Single lib submodule + workspace ref
```bash
bash tools/git-push.sh "<type>(<scope>): <subject>" <lib-name>
```

### All libs + workspace ref
```bash
bash tools/git-push.sh "<type>(<scope>): <subject>" --all
```

> **IMPORTANT**: NEVER commit lib source code to the workspace repo directly. Workspace only tracks submodule refs.

## Commit Convention
- `feat` → new feature (minor)
- `fix` → bug fix (patch)
- `refactor` → code change, no feat/fix
- `chore` → build, tooling, deps
- `style` / `docs` / `test`
