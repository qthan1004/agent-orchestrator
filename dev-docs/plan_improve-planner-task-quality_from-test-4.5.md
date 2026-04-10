# Plan: Cải tiến Planner & Task Quality — Target ≥85%

> **Nguyên nhân**: Test `@thanh-libs/switch` v0.0.1 đạt 4.5/10 (target ≥8.0)
> **Test result**: [test-result_switch-v0.0.1_enhance-prompt.md](./test-result_switch-v0.0.1_enhance-prompt.md)
> **Date**: 2026-04-10
> **Scope**: Kết hợp cả 3 hướng cải tiến, server change tối thiểu, prompt-first

---

## Quyết định từ discussion

| # | Quyết định | Chi tiết |
|---|-----------|----------|
| Q1 | **Bắt buộc Reference Study cho MỌI plan** | + Cần cơ chế "workspace cache" để không đọc lại mỗi lần |
| Q2 | **Prompt-first** cho plan validation | Server không can thiệp được flow hiện tại → dùng prompt enforce |
| Q3 | **Prompt-first** cho task schema | Giữ schema hiện tại, sửa prompt guide format |
| Q4 | **Tách stale threshold thành 2 constants** | Không đơn giản đổi 30→120s (xem phân tích bên dưới) |
| Q5 | **Hướng kết hợp**: Prompt (chính) + Config/Server (tối thiểu) | |

---

## Phân tích Stale Threshold — Tại sao không đơn giản tăng lên

### Vấn đề: `staleThresholdMs` dùng cho 2 mục đích khác nhau

```
staleThresholdMs (30s) dùng ở:
├── recovery.mjs:154  → checkStaleWorkers() → requeue task stuck
└── idle-resolver.mjs:12 → getActivePlanner() → check planner còn sống không
    └── worker-registry.mjs:134 → "planner alive if heartbeat < threshold"
```

**Nếu tăng lên 120s:**
- ✅ Worker không bị false-positive requeue khi đang work
- ❌ `getActivePlanner()` coi planner "alive" suốt 120s → nếu planner crash, phải chờ 120s mới elect planner mới → **delay plan decompose**
- ❌ Task thật sự stuck phải chờ 120s mới recover

### Đề xuất: Tách thành 2 threshold riêng biệt

| Constant | Mục đích | Giá trị | Giải thích |
|----------|----------|---------|------------|
| `STALE_WORKER_THRESHOLD_MS` | Recovery — requeue task stuck | **90s** | An toàn cho LLM (thinking 10-30s + tool call gaps) |
| `PLANNER_ALIVE_THRESHOLD_MS` | Planner election — check planner alive | **45s** | Planner gọi tool thường xuyên hơn worker khi decompose |

**Kết hợp với prompt enforce**: Bắt worker gọi `report_progress` mỗi 60s → heartbeat tự update → không bao giờ hit 90s threshold khi đang work bình thường.

### Thay đổi cụ thể:

#### [MODIFY] `src/constants.mjs`

```diff
 export const RECOVERY_DEFAULTS = {
   MONITOR_INTERVAL_MS: 5_000,
-  STALE_THRESHOLD_MS: 30_000,
+  STALE_WORKER_THRESHOLD_MS: 90_000,   // 90s — worker task stuck detection
+  PLANNER_ALIVE_THRESHOLD_MS: 45_000,  // 45s — planner heartbeat check
   MAX_RETRIES: 3,
   MAX_TASK_RETRIES: 3
 };
```

#### [MODIFY] `src/config.mjs`

```diff
 recovery: {
-  staleThresholdMs: overrides.staleThresholdMs || RECOVERY_DEFAULTS.STALE_THRESHOLD_MS,
+  staleWorkerThresholdMs: overrides.staleWorkerThresholdMs || RECOVERY_DEFAULTS.STALE_WORKER_THRESHOLD_MS,
+  plannerAliveThresholdMs: overrides.plannerAliveThresholdMs || RECOVERY_DEFAULTS.PLANNER_ALIVE_THRESHOLD_MS,
   maxTaskRetries: overrides.maxTaskRetries || RECOVERY_DEFAULTS.MAX_TASK_RETRIES,
 }
```

#### [MODIFY] `src/mcp-server/recovery.mjs`

```diff
-  this.staleThresholdMs = recoveryConfig.staleThresholdMs ?? RECOVERY_DEFAULTS.STALE_THRESHOLD_MS;
+  this.staleThresholdMs = recoveryConfig.staleWorkerThresholdMs ?? config.recovery?.staleWorkerThresholdMs ?? RECOVERY_DEFAULTS.STALE_WORKER_THRESHOLD_MS;
```

#### [MODIFY] `src/mcp-server/idle-resolver.mjs`

```diff
-  const activePlanner = workerRegistry.getActivePlanner(config.recovery.staleThresholdMs);
+  const activePlanner = workerRegistry.getActivePlanner(config.recovery.plannerAliveThresholdMs);
```

#### [MODIFY] `src/mcp-server/tools.mjs` (register_worker)

```diff
-  const { staleThresholdMs } = context.config.recovery;
+  const { plannerAliveThresholdMs } = context.config.recovery;
   ...
-  const activePlanner = workerRegistry.getActivePlanner(staleThresholdMs);
+  const activePlanner = workerRegistry.getActivePlanner(plannerAliveThresholdMs);
```

#### [MODIFY] `src/utils/startup-prompt.mjs` — update key nếu reference đến `staleThresholdMs`

---

## Prompt Changes — `prompts/agent-prompt.md`

### Change 1: Section P Step 3 — Full rewrite (5 sub-steps)

**Replace** hiện tại (line 119-126) với:

```markdown
3. **[Mode B]** Receive plan content. Execute the following sub-steps IN ORDER:

   ### Step 3A — Workspace Discovery (MANDATORY — every plan)
   
   Read ALL of the following (skip only if file doesn't exist):
   
   1. `workspace_root/.agent/context.md` — project conventions, skill index
   2. Each skill in `workspace_root/.agent/skills/*/SKILL.md` — read ALL skills
   3. `workspace_root/.agent/workflows/` — list and read relevant workflows
   4. If `workspace_root/plan/tasks/done/` exists — read 1-2 recent tasks as **format template**
   
   **Cache discovered rules in your reasoning.** You will inject them into every task.
   
   ### Step 3B — Reference Implementation Study (MANDATORY — every plan)
   
   REGARDLESS of plan type (new component, fix, refactor):
   1. Find the most similar existing code in `workspace_root` 
      (e.g., `chip` for `switch`, `button` for `icon-button`, existing module for a fix)
   2. READ the actual source code of key files relevant to the plan
   3. Extract the REAL patterns used:
      - How does the codebase access theme? (useTheme vs theme arg?)
      - What types/interfaces patterns? (import type?)
      - What dependencies are actually imported vs declared?
      - HTML element choices, naming conventions, file structure
   4. Use these REAL patterns as ground truth — NOT the plan's code,
      if plan contradicts actual codebase patterns.
   
   ### Step 3C — Plan Validation (MANDATORY — DO NOT SKIP)
   
   Cross-check the plan's code/specs against workspace skills AND reference code:
   
   1. **Convention check**: Does plan follow discovered skill rules?
   2. **Type safety check**: Are nullable types accessed with optional chaining?
   3. **HTML semantics check**: Are elements correct? (No `<label>` wrapping interactive elements)
   4. **Dependency audit**: Do declared dependencies match actual imports?
   5. **Accessibility check**: role, aria-*, keyboard handling per skill rules
   
   Record ALL issues as `plan_issues` in your `reasoning` field.
   For each issue, inject a **CORRECTIVE instruction** into the affected task's `action` field.
   
   ### Step 3D — Task Decomposition (produce detailed tasks)
   
   Break plan into atomic tasks. Each task `action` field MUST contain:
   
   a) **Goal**: 1 sentence — what this task achieves
   b) **Files**: Exact workspace-relative paths to create/modify/delete
   c) **What to Do**: Detailed instructions including:
      - Code patterns from reference implementation (Step 3B), NOT plan if plan had bugs
      - Specific type signatures, import paths
      - Key implementation details with concrete values
   d) **Constraints**: 
      - ALWAYS include skill paths to read (from Step 3A)
      - Task-specific conventions discovered
      - If plan had bugs: "PLAN DEVIATION: [what to do instead]"
   e) **Done Criteria**: 3-8 checkable items specific to this task
   
   Each task `verification` field MUST contain:
   - Exact executable shell commands (e.g., "cd libs/switch && npx tsc --noEmit")
   - NEVER vague phrases like "Compile passes"
   
   ### Step 3E — Quality Self-Check (before submit_decomposition)
   
   Before calling submit_decomposition, verify:
   - [ ] Every task has file paths in its action
   - [ ] Every task references relevant skills
   - [ ] Every task has executable verification commands
   - [ ] Every task has 3+ done criteria
   - [ ] Plan bugs are noted and corrected in task constraints
   - [ ] Tasks are self-contained: Worker can execute without reading the plan
```

### Change 2: Section W Step 3 — Expanded worker protocol

**Replace** `3. [Mode B] Read task_details...` qua `4. Verify...` với:

```markdown
3. **[Mode B]** Read `task_details`. Execute with the following protocol:
   
   **Pre-flight (before writing any code):**
   - Read ALL skills referenced in the task's constraints
   - If task references a similar lib → read its actual source code
   - Parse the task's done criteria — these are your acceptance tests
   
   **Implementation:**
   - Follow skill rules STRICTLY — they override your preferences
   - Follow task constraints STRICTLY — especially "PLAN DEVIATION" notes
   - Use patterns from reference code, not improvised patterns
   
   **Self-Validation (MANDATORY before complete_task):**
   1. Run the ACTUAL verification command(s) from the task — do NOT skip
   2. Walk through EACH done criteria item — confirm your code satisfies it
   3. If ANY check fails → fix before calling complete_task
   
   > **CRITICAL**: Do NOT call complete_task with status "done" unless ALL done criteria are satisfied and verification commands pass.

4. **Verify** — Self-validation is part of step 3. If task takes > 60 seconds, call `report_progress` to keep your heartbeat alive.
```

### Change 3: Section 4 Rules — Add rules 7-12

**Append** sau rule 6:

```markdown
7. **Plan is NOT gospel**: Plans may contain bugs. When decomposing,
   validate plan code against workspace skills and real codebase patterns. 
   Workers: if task constraints say "PLAN DEVIATION", follow the constraint, not the plan.
   
8. **Self-contained tasks**: Each task must contain enough detail that 
   a Worker with NO prior knowledge can execute it correctly. 
   Include code patterns, skill paths, verification commands, and done criteria.
   
9. **Reference-first coding**: ALWAYS read the most similar existing code first. 
   Use its real patterns as ground truth.
   
10. **Verification means execution**: Run the actual command. Report the output. 
    Vague phrases like "Compile passes" are NOT verification.

11. **Self-check before done**: NEVER mark a task as "done" unless ALL done criteria 
    are verified. If done criteria are missing, create your own checklist based on 
    the task's goal and constraints.

12. **Heartbeat for long tasks**: If a task takes > 60 seconds, call `report_progress` 
    at least once every 60s. This prevents false stale-worker detection.
```

### Change 4: Appendix — Bad vs Good task example + Workspace cache

**Add** ở cuối file:

````markdown
---

## Appendix A: Task Quality — Bad vs Good

### ❌ BAD Task (insufficient — Worker will improvise and likely produce bugs)
```json
{
  "id": "03-styled",
  "module": "libs/switch",
  "action": "Create styled.tsx with styled components. CONSTRAINT: Strict scope.",
  "verification": "Compile passes."
}
```

### ✅ GOOD Task (Worker can execute correctly without additional context)
```json
{
  "id": "03-styled-components",
  "module": "libs/switch",
  "action": "Goal: Create src/lib/styled.tsx with 4 emotion styled components.\n\nFiles:\n- NEW: libs/switch/src/lib/styled.tsx\n\nWhat to Do:\n1. SwitchRootStyled — styled.div (NOT label). Flex container.\n2. SwitchTrackStyled — styled.button. Toggle track. Access theme via useTheme().\n   Background checked: palette?.primary?.main (optional chaining required).\n3. SwitchThumbStyled — styled.span. Circular thumb with left offset.\n4. SwitchLabelStyled — styled.span. Label text.\n\nConstraints:\n- Read: .agent/skills/component-patterns/SKILL.md\n- Use useTheme() NOT theme from styled args\n- All palette access MUST use optional chaining\n- PLAN DEVIATION: Plan says styled.label for Root — use styled.div instead\n\nDone criteria:\n- [ ] 4 styled components exported\n- [ ] useTheme() pattern used (not theme arg)\n- [ ] All palette access uses optional chaining\n- [ ] SwitchRootStyled uses div, not label\n- [ ] Executable verification passes",
  "verification": "cd libs/switch && npx tsc --noEmit -p tsconfig.lib.json"
}
```

---

## Appendix B: Workspace Discovery Cache

When working with the same `workspace_root` across multiple plans:
- Skills, context.md, and reference patterns rarely change between plans
- On first plan: do full discovery (Step 3A + 3B)
- On subsequent plans in same session: re-read only if plan targets a different module
- Always re-validate (Step 3C) for every plan — plan bugs are per-plan
````

---

## Tổng hợp thay đổi

### Server changes (tối thiểu — 6 files, ~15 lines)

| File | Change | Lines |
|------|--------|-------|
| `src/constants.mjs` | Tách `STALE_THRESHOLD_MS` → 2 constants | ~3 lines |
| `src/config.mjs` | Update config keys | ~3 lines |
| `src/mcp-server/recovery.mjs` | Use new constant name | ~1 line |
| `src/mcp-server/idle-resolver.mjs` | Use planner threshold | ~1 line |
| `src/mcp-server/tools.mjs` | Use planner threshold | ~2 lines |
| `src/utils/startup-prompt.mjs` | Update key nếu cần | ~1 line |

### Prompt changes (1 file, major rewrite)

| File | Change |
|------|--------|
| `prompts/agent-prompt.md` | Rewrite Section P Step 3 (5 sub-steps), expand Section W Step 3, add rules 7-12, add appendices |

---

## Verification Plan

### Automated
1. `node test.mjs` — existing tests pass
2. Server starts without errors

### Manual Re-test
1. Reset switch lib trong workspace test (`/home/administrator/back up/Personal lib/libs/switch`)
2. Drop `2026-04-07_switch_v0.0.1.md` vào `plan/pending/`
3. Chạy orchestrator → cho agent decompose + execute
4. Đánh giá theo cùng rubric trong test-result
5. Target: ≥ 8.5/10

---

## Rủi ro & Giới hạn

| Risk | Mitigation |
|------|-----------|
| Task action quá dài → token overflow cho plan lớn | Giới hạn max 20 tasks/submission đã có |
| Model không tuân thủ prompt mới | Appendix example giúp model "thấy" format chuẩn |
| Workspace discovery tốn thêm ~1500 tokens/plan | Trade-off chấp nhận — tiết kiệm retry tokens |
| Tách threshold có thể break test cũ | Check startup-prompt.mjs và test files |
| Chỉ prompt changes max ~85% | Nếu re-test <85%, cần xét server-side validation (phase 2) |
