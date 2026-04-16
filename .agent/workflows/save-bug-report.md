---
description: Save a bug report to dev-docs/bugs/ with standardized filename.
---

# Save Bug Report

Save the current bug report to `dev-docs/bugs/` with a standardized name.

## Naming Convention

```
dev-docs/bugs/<YYYY-MM-DD>_<module>_<version>.md
```

- **`<YYYY-MM-DD>`**: Current date from system time
- **`<module>`**: Module/lib name (lowercase, no prefix)
- **`<version>`**: Related version (e.g., `v0.1`, `v1.0`)

## Steps

1. Determine **module name** from current context
2. Determine **version** from context
3. Get **current date** (format `YYYY-MM-DD`)
4. Create directory if needed

// turbo
5. Copy or create the file:
```bash
mkdir -p "dev-docs/bugs"
cp "<artifact_dir>/bug_report.md" "dev-docs/bugs/<date>_<module>_<version>.md"
```

## Examples

| Context | Filename |
|---------|----------|
| Menu lib bug on 2026-03-30 | `dev-docs/bugs/2026-03-30_menu_v0.1.md` |
| Dialog lib bug v1.0 on 2026-04-15 | `dev-docs/bugs/2026-04-15_dialog_v1.0.md` |
