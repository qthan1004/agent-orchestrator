---
name: Safe Deletion Protocol
description: Never delete files or directories without explicit user permission.
---

# Safe Deletion Protocol

**CRITICAL**: NEVER delete any file or directory without explicit user approval.

## Rules

1. **Ask first** — If you need to delete, remove, or clean up files (especially via `rm`, `rm -rf`, `rmdir`), STOP and ask permission.
2. **Explain why** — State clearly why the file should be deleted.
3. **No assumptions** — Never justify deletion with "I thought it was junk" or "it seemed misplaced."
4. **Tool constraint** — Always set `SafeToAutoRun: false` for any destructive command.
