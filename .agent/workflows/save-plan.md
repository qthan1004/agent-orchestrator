---
description: Save the current implementation plan to dev-docs/ with standardized filename.
---

# Save Plan

Save an implementation plan to `dev-docs/` with a standardized name.

## Directory Structure

```
dev-docs/
  ├── <lib-name>/                   ← Plans for a specific lib
  │   └── <date>_<topic>_<ver>.md
  └── <general-plan>.md             ← Cross-lib, infra, CI/CD plans
```

- **Lib-specific**: Create `dev-docs/<lib-name>/` (lowercase) subfolder
- **General**: Place directly in `dev-docs/`

## Naming Convention

```
dev-docs/<lib-name>/<YYYY-MM-DD>_<topic>_<version>.md   (lib-specific)
dev-docs/<YYYY-MM-DD>_<topic>_<version>.md               (general)
```

- **`<YYYY-MM-DD>`**: Current date from system time
- **`<lib-name>`**: Lib name (lowercase)
- **`<topic>`**: Brief description (lowercase, kebab-case)
- **`<version>`**: Plan version (e.g., `v0.1`, `v1.0`)

## Steps

1. Determine if plan is **lib-specific** or **general**
2. Determine **lib name** (if lib-specific) or **topic**
3. Determine **version** from context
4. Get **current date** (format `YYYY-MM-DD`)

// turbo
5. Create directory and save file:
```bash
# Lib-specific
mkdir -p "dev-docs/<lib-name>"
cp "<artifact_dir>/implementation_plan.md" "dev-docs/<lib-name>/<date>_<topic>_<version>.md"

# General
cp "<artifact_dir>/implementation_plan.md" "dev-docs/<date>_<topic>_<version>.md"
```

## Examples

| Context | Path |
|---------|------|
| Menu enhance plan v0.2 | `dev-docs/menu/2026-04-01_enhance_v0.2.md` |
| CI/CD pipeline (general) | `dev-docs/cicd-pipeline.md` |
| Utils keyboard plan v0.1 | `dev-docs/utils/2026-04-01_useKeyboard_v0.1.md` |
