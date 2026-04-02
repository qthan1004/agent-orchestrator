---
description: Create a new lib from scratch — scaffold, configure git, push
---

// turbo-all


# Create a New Library

## 1. Scaffold
```bash
bash tools/gen-lib.sh <lib-name>
```

## 2. Analysis & Planning (MUST complete before implementation)

> **Do NOT implement any component code yet.** This gate prevents wasted quota.

After scaffold is verified, perform the following:

1. **Analyze the scaffolded lib** — review what was generated, identify what the component needs (props, variants, states, sub-components).
2. **Research reference libraries** — study how MUI, Ant Design, and shadcn/ui implement the same component. Focus on:
   - API design (props, slots, composition patterns)
   - Variants & states
   - Accessibility approach
   - Any notable patterns worth adopting or avoiding
3. **Write an analysis doc** (`implementation_plan.md`) covering:
   - Component purpose & scope
   - Proposed API (props table with types & defaults)
   - Reference comparison (what to adopt from each library)
   - Open questions / trade-offs for user to decide
4. **Send to user for review** via `notify_user` with `BlockedOnUser: true`.
5. **Wait for user confirmation** — only proceed to implementation after approval.

## 3. GitHub & Git Setup
```bash
bash tools/git-setup-lib.sh <lib-name>
```

## 4. Verify
- Add `NPM_TOKEN` inside github.com/system-core-ui/<lib-name>/settings/secrets/actions
- Build test:
```bash
cd libs/<lib-name>
npm install
npx vite build
```

## Notes
- `gen-lib.sh` handles: nx scaffold + storybook + templates copy + verification.
- Templates live in `tools/templates/` — update there to change defaults for all future libs.
- After this workflow, the lib is immediately ready for `/publish-lib`.
