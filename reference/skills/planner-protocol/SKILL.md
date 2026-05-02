---
name: Planner Protocol
description: Full planning and decomposition protocol for PLANNER role. Load on-demand when assigned PLANNER role.
---

# Planner Protocol (Decomposer)

Decompose master plans into atomic tasks with DAG dependencies.

## Loop Protocol

```
check_plans()
  → DECOMPOSE? → Read plan content → Analyze → submit_decomposition()
                                                  → Has next_plan? → Loop back ↑
                                                  → IDLE? → Switch to Worker (Section W)
  → WAIT? → Plan being processed by another planner → retry
  → IDLE? → Switch to Worker (Section W)
```

## Step-by-step

1. **[Mode A]** Call `check_plans()` — Server long-polls up to 60s.
2. **Read the `action` field**:
   - `DECOMPOSE` → proceed to step 3
   - `WAIT` → A plan is being processed. Keep polling.
   - `IDLE` → No plans. Switch to **Section W** (Worker Role).
3. **[Mode B]** Receive plan content. Execute the following sub-steps IN ORDER:

   ### Step 3A — Workspace Discovery (SMART SCAN & LAZY LOADING)

   Read ALL of the following static assets (skip only if file doesn't exist):
   0. **`workspace_root/.agent/config.md`** — **MANDATORY Boot Config**. Read FIRST and execute its Pre-flight Protocol before anything else.
   1. `workspace_root/.agent/context.md` — project conventions, skill index
   2. Each skill in `workspace_root/.agent/skills/*/SKILL.md` — read ALL skills
   3. `workspace_root/.agent/workflows/` — list and read relevant workflows

   **Knowledge Base Smart Scan (`workspace_root/.agent/knowledge/`)**:
   4. **Template Retrieval (MANDATORY)**: BEFORE creating or analyzing any knowledge, you MUST call `get_template` with `template_name: "knowledge.md"` to understand the standard architecture outline required by the Orchestrator.
   5. **Check Manifest**: Look for `MANIFEST.md`. If it doesn't exist, create it to track global config hashes and scanned module scopes.

   6. **Cold Start Detection (CRITICAL — FULL DISCOVERY)**:
      Check if `workspace_root/.agent/knowledge/project_knowledge.md` exists.

      **IF IT DOES NOT EXIST → You are in Cold Start mode. MANDATORY FULL WORKSPACE DISCOVERY:**

      > ⚠️ **WARNING**: Scanning only the target module on a Cold Start produces dangerously incomplete knowledge. For example, if the plan targets `libs/switch` but the workspace also has `libs/theme`, `libs/core`, `libs/shared-utils`, etc., you will miss critical shared utilities, design tokens, and patterns — leading to duplicated code, wrong imports, and broken builds.

      You MUST perform a **comprehensive top-down scan** of the ENTIRE workspace:
      a) `list_dir` at `workspace_root/` to discover ALL top-level directories (`libs/`, `apps/`, `packages/`, `core/`, `shared/`, etc.)
      b) For EACH top-level directory that contains code modules, `list_dir` its children to map the full module tree
      c) For EACH discovered module, read its key entry points:
         - `package.json` (name, dependencies, exports)
         - `src/index.ts` or `src/index.tsx` (public API surface)
         - Any `src/lib/` directory listing (to understand internal structure)
      d) Read workspace-level config files: root `package.json`, `tsconfig.base.json`, `nx.json` / `turbo.json` / `lerna.json` (if monorepo)
      e) Identify and document:
         - **Shared utilities**: Helper functions, hooks, HOCs available across modules
         - **Theme/Design tokens**: Colors, spacing, typography, shadows
         - **Common patterns**: Styling approach (emotion/styled-components/CSS modules), state management, component composition
         - **Directory Structure & File Placement**: Exact locations for source code vs test files (e.g. are test files inside `src/` or a separate `tests/` directory?), and stories.
         - **Cross-module dependencies**: Which modules depend on which
      f) Create both `MANIFEST.md` (with git hashes for ALL scanned modules) and `project_knowledge.md` (filled from the `knowledge.md` template with FULL workspace context)

      > **CRITICAL**: Do NOT skip any module during Cold Start. The cost of scanning everything ONCE is far less than the cost of producing wrong code from incomplete knowledge. Token optimization (Lazy Scan) only applies AFTER the initial full scan.

      After Full Discovery is complete, proceed to **Step 7** (Invalidation Check) for future runs.

   **IF `project_knowledge.md` ALREADY EXISTS → Incremental mode (steps 7–9 below):**

   7. **Invalidation Check**: Run `git log -1 --format="%H" -- <module_path>` to get the ACTUAL commit hash. If it differs from the MANIFEST, OR if the plan explicitly mentions "Refactor/Upgrade", you MUST break the cache.
      > **CRITICAL**: You MUST use the REAL git commit hash (e.g. `a1b2c3d`). Values like `new`, `initial`, `unknown`, or any non-hash string are REJECTED. If git is not available or the module has no commits, use `untracked` and ALWAYS perform a Deep Discovery.
   8. **Lazy Scan (TOKEN OPTIMIZATION)**: Only scan the specific module targeted by the plan.
      - **Cache Hit**: If the module hash matches MANIFEST and is marked `[x]`, **DO NOT read its source code again** (to save tokens). Your knowledge is already up-to-date in `project_knowledge.md`.
      - **Cache Miss**: If hash differs or is missing, perform Deep Discovery (read actual source code of the module to find architectural patterns).
   9. **Meticulous Merge**: When updating, NEVER overwrite blindly. Fill out the retrieved `knowledge.md` template, merge it into the unified `workspace_root/.agent/knowledge/project_knowledge.md`, and **update the MANIFEST hash with a `[x]` checkmark** to definitively mark it as scanned. Do NOT save anything in the orchestrator directory.
      > Knowledge MUST document ALL shared utilities (e.g. `pxToRem`, `alpha`), theme tokens (spacing, palette, shadows), and styling conventions discovered during Deep Discovery.

   ### Step 3B — Reference Implementation Study (MANDATORY — every plan)

   REGARDLESS of plan type (new component, fix, refactor):
   1. Find the most similar existing code in `workspace_root`
      (e.g., `chip` for `switch`, `button` for `icon-button`, existing module for a fix)
   2. READ the actual source code of key files relevant to the plan
   3. Extract the REAL patterns used:
      - How does the codebase access theme? (Are `useTheme` and `styled` imported from `@emotion/react` or the internal UI library?)
      - How are components wrapped in test files? (Crucial: Which exact library provides the `ThemeProvider` wrap in `.spec.tsx`?)
      - What types/interfaces patterns? (import type?)
      - What dependencies are actually imported vs declared?
      - HTML element choices, naming conventions
      - Exact file & directory structure (Crucial: where are `.spec.tsx` test files placed? where are stories placed?)
   4. Use these REAL patterns as ground truth — NOT the plan's code,
      if plan contradicts actual codebase patterns.

    **Test & Story File Location Discovery (CRITICAL — MUST DO):**
    5. For the TARGET module AND at least ONE reference module, explicitly check:
       - `list_dir` the module root to see if a `tests/` folder exists at root level (sibling of `src/`)
       - `list_dir` `src/lib/` to confirm NO `.spec.tsx`/`.test.tsx` files exist there
       - If the target module already has test files, note their EXACT path and import patterns
    6. Record the discovered test file convention as a binding constraint for Step 3D.
       > **CRITICAL**: If existing tests live in `<module>/tests/`, ALL new/modified tests MUST go there too. NEVER place tests inside `src/` or `src/lib/` even if tsconfig technically allows it.

   ### Step 3C — Plan Validation (MANDATORY — DO NOT SKIP)

   Cross-check the plan's code/specs against workspace skills AND reference code:
   1. **Convention check**: Does plan follow discovered skill rules?
   2. **Type safety check**: Are nullable types accessed with optional chaining?
   3. **HTML semantics check**: Are elements correct? (No `<label>` wrapping interactive elements)
   4. **Dependency audit**: Do declared dependencies match actual imports?
   5. **Accessibility check**: Verify the plan includes correct ARIA semantics for EACH interactive element:
      - **Identify the element's purpose** → match to the correct WAI-ARIA pattern (e.g., switch, breadcrumb, dialog, tabs, menu)
      - **State attributes**: Does the element have a "current", "selected", "checked", "expanded", or "pressed" state? → ensure the matching `aria-*` attribute is specified (e.g., `aria-current="page"`, `aria-checked`, `aria-expanded`, `aria-selected`)
      - **Roles**: Is a non-default role needed? (e.g., `role="switch"`, `role="tablist"`, `role="navigation"`)
      - **Keyboard**: What keys should trigger actions? (Enter, Space, Escape, Arrow keys) — verify they are handled
      - **Labels**: Are interactive elements without visible text labeled via `aria-label` or `aria-labelledby`?
      - If the plan omits ANY of the above for an interactive element, record it as a `plan_issue` and inject a corrective PLAN DEVIATION into the affected task

   Record ALL issues as `plan_issues` in your `reasoning` field.
   For each issue, inject a **CORRECTIVE instruction** into the affected task's `action` field.

   ### Step 3D — Task Decomposition (produce detailed tasks)

   > **HEARTBEAT**: Follow **Section 5** — ping between file reads at natural boundaries (not mid-analysis).

   Break plan into atomic tasks. Each task `action` field MUST contain:

   a) **Goal**: 1 sentence — what this task achieves
   b) **Files**: Exact workspace-relative paths to create/modify/delete
      > **CRITICAL for test files**: Use the EXACT test directory discovered in Step 3B (e.g., `tests/Component.spec.tsx`, NOT `src/lib/Component.spec.tsx`). Cross-reference with existing test files in the target module.
   c) **What to Do**: Detailed instructions including:
   - Code patterns from reference implementation (Step 3B), NOT plan if plan had bugs
   - Specific type signatures, import paths
   - Key implementation details with concrete values
     d) **Constraints**:
   - ALWAYS include skill paths to read (from Step 3A)
   - Task-specific conventions discovered
   - If plan had bugs: "PLAN DEVIATION: [what to do instead]"
   - For test tasks: "Test files MUST be placed in `tests/` directory (root level, sibling of `src/`)"
     e) **Done Criteria**: 3-8 checkable items specific to this task

   Each task `verification` field MUST contain:
   - Exact executable shell commands (e.g., "cd libs/switch && npx tsc --noEmit")
   - NEVER vague phrases like "Compile passes"
   - NEVER use `--passWithNoTests` — if tests exist, they MUST actually run and pass

   **Task Naming (CRITICAL):**
   - DO NOT use slashes `/` or backslashes `\` in task `id`s. Use hyphens `-` instead. (e.g., `breadcrumb-enhancements-01-models`, NOT `plan/processing/breadcrumb-01`).

   **Mandatory Tasks for Library Plans:**
   Every plan that creates a new lib MUST include ALL of the following task types:
   - **Scaffold task**: config files, package.json, tsconfig files (including `tsconfig.storybook.json`), AND supporting files (.gitignore, check-deps.mjs) cloned from reference lib
   - **Stories task**: Storybook stories covering core variants (sizes, colors, states, controlled/uncontrolled, playground with argTypes)
   - **Unit test task**: at minimum test render, props, a11y (jest-axe), and keyboard interaction
   - **Documentation task**: README.md (from reference lib template), CHANGELOG.md

   **Helpers Extraction:**
   If a component has non-trivial logic (e.g., collapse/expand, color computation, item filtering),
   extract it into a `helpers.ts` file following existing codebase patterns (e.g., `getColorPalette()` in chip).
   Include this as part of the component task or as a separate helpers task.

   **DAG Parallelism:**
   Identify tasks that have NO real data dependency and group them as parallel.
   Example: a model/types task does NOT depend on scaffold/config files — they can run in the same group.

   ### Step 3E — Quality Self-Check (before submit_decomposition)

   Before calling submit_decomposition, verify:
   - [ ] Every task has file paths in its action
   - [ ] Task `id`s do not contain any slashes (`/` or `\`)
   - [ ] Every task references relevant skills
   - [ ] Every task has executable verification commands
   - [ ] Every task has 3+ done criteria
   - [ ] Plan bugs are noted and corrected in task constraints
   - [ ] Tasks are self-contained: Worker can execute without reading the plan
   - [ ] Stories task is included (for lib plans)
   - [ ] Unit test task is included (for lib plans)
   - [ ] Documentation task is included (for lib plans)
   - [ ] Scaffold includes `tsconfig.storybook.json` (for lib plans)
   - [ ] `aria-current` is specified for navigation components (breadcrumb, tabs, nav)
   - [ ] Tasks with no real dependency are grouped in parallel DAG groups
   - [ ] MANIFEST uses actual git commit hash (not `new`, `initial`, etc.)
   - [ ] **Test file paths match discovered convention** (e.g., `tests/X.spec.tsx` NOT `src/lib/X.spec.tsx`)
   - [ ] **No verification command uses `--passWithNoTests`**

4. **Submit** — Call `submit_decomposition(tasks, graph, reasoning, source_plan, worker_id)`.
   - **CRITICAL:** You MUST extract and provide ONLY the base filename for the `source_plan` parameter (e.g. `"breadcrumb_enhancements.md"`, NOT `"plan/processing/breadcrumb_enhancements.md"`). The server backend uses this exact filename to find the file and move it to `done/` upon successful submission. Do NOT skip this or pass slashes!
5. **Read `next_plan`** from the response:
   - Has `action: DECOMPOSE` + new plan → go to step 3
   - `IDLE` → Server reverts you to Worker. Go to **Section W**.
