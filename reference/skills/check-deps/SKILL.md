---
name: Dependency Audit
description: Automatically check @thanh-libs/* import/dependency mismatches across all libs. Run via /check-deps workflow.
---

# Dependency Audit Skill

## Purpose

Detect missing `@thanh-libs/*` dependency declarations across the monorepo. Catches:
- Source code imports `@thanh-libs/foo` but `package.json` doesn't declare it
- Internal deps using fixed versions instead of `"*"`

## Usage

Run the workflow:
```
/check-deps
```

Or directly:
```bash
bash ".agent/skills/check-deps/check-deps.sh"
```

## Convention

All internal `@thanh-libs/*` deps should be declared as:
```json
{
  "peerDependencies": {
    "@thanh-libs/utils": "*"
  },
  "devDependencies": {
    "@thanh-libs/utils": "*"
  }
}
```

## When to Run

- After adding new `@thanh-libs/*` imports to any lib
- Before publishing a lib (integrated into release workflow)
- When debugging "module not found" build errors
