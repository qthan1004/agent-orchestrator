---
description: Check all libs for missing @thanh-libs/* dependency declarations in package.json
---

# Check Dependency Mismatches

Scan all libs for import/dependency mismatch — find cases where source code imports `@thanh-libs/*` but `package.json` doesn't declare it.

## Steps

// turbo-all

1. Run the check-deps script:

```bash
bash ".agent/skills/check-deps/check-deps.sh"
```

2. Review the output. If mismatches are found, the script will list them clearly.

3. If fixes are needed, update the relevant `package.json` files following the pattern:
   - Add to `peerDependencies` with `"*"` (for internal libs)
   - Mirror in `devDependencies` with `"*"`
