# Task P2-43: Case Bank Save

## Info
- **ID:** P2-43-case-bank-save
- **Module:** `src/worker/case-bank.ts` (NEW)
- **Group:** Post-Core Intelligence
- **Dependencies:** P2-13, P2-01, P2-38, P2-20, P2-42
- **Priority:** 11
- **Ref:** Phase 2 memory boundary rules
- **Updated:** 2026-05-21 (entity tags + confidence scoring from Mem0 research)

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## Design Decisions (from Mem0 research)

### Entity tags (Idea from Mem0 entity linking)

Each reflection includes entity tags — structured metadata for future search quality.
Entity tags enable Phase 3 search to find related cases even when keywords differ.
(e.g., "Socket.IO" case found when searching "real-time events")

### Confidence scoring (Adapted from Mem0 — approval-gated)

Each reflection gets an initial confidence score based on outcome.
**CRITICAL RULE: Confidence is observational only — NOT auto-promotion.**

- Agent **CANNOT** auto-promote lessons to active knowledge
- Agent **CANNOT** retract or modify existing reflections
- Reflections are **READ-ONLY observations** until user explicitly promotes
- Promotion requires the three-gate pipeline: Worker proposal → Planner evaluation → User evaluation/approval

### Why user-gated?

Risk analysis: Agent CRUD on lessons without user involvement is dangerous because:
1. Wrong lesson promoted → all future workers inherit wrong pattern
2. Correct lesson retracted → knowledge lost silently
3. Edge cases in auto-promote logic are unpredictable

**Rule: Agents WRITE reflections/proposals only. Only explicit User approval can promote knowledge.**

## What to do

After AgentRunner completes a task (success or fail), save a reflection markdown file into the **workspace-scoped case bank by default**.

### Default location

`<workspace-runtime>/memory/case-bank/{date}_{task-id}.md`

### Scope rules

- Default write target is **workspace-local**
- Cross-workspace/global memory is **not** the default
- Any future promotion to global knowledge must be explicit and outside this task
- Reflection metadata must include `workspace_id` or normalized workspace path

### Reflection format (markdown)

```markdown
# Reflection: {task-id}
<!-- Date: {ISO date} -->
<!-- Outcome: SUCCESS | FAILED | PARTIAL -->
<!-- Domain: {detected or 'unknown'} -->
<!-- Task Type: {action type} -->
<!-- Workspace: {workspace_id} -->
<!-- Confidence: {0.0-1.0} -->
<!-- Corroborations: 0 -->
<!-- Entities: {entity1}, {entity2}, {entity3} -->
<!-- Files: {file-path1}, {file-path2} -->
<!-- Concepts: {concept1}, {concept2} -->

## What Worked
- {auto-generated from successful steps}

## What Failed
- {auto-generated from error_context if present}

## Lesson
- {LLM-generated self-reflection, 2-3 bullet points}
```

### Confidence assignment rules

| Outcome | Initial Confidence | Rationale |
|---------|-------------------|----------|
| SUCCESS + no errors | 0.7 | Likely correct, but unverified by user |
| SUCCESS + had retries | 0.6 | Worked but path was bumpy |
| PARTIAL | 0.5 | Incomplete, lesson may be wrong |
| FAILED + has diagnosis | 0.4 | Diagnosis could be incorrect |
| FAILED + no diagnosis | 0.3 | Low signal |

> **Note:** Confidence NEVER auto-increases in Phase 2. The `Corroborations` field is reserved for Phase 3 when similar lessons can be cross-referenced. Corroboration + promotion logic requires user-facing review UI.

### Entity extraction rules

Worker extracts entities as part of reflection generation (same LLM call):

- **Entities**: Named tools, libraries, patterns (e.g., `ollama`, `zod`, `tool-calling`)
- **Files**: File paths touched during task
- **Concepts**: Abstract concepts (e.g., `subprocess`, `stdin-protocol`, `prompt-engineering`)

Extraction is best-effort — missing entities is OK, wrong entities are low risk (only affects search ranking, not behavior).

### Flow

1. AgentRunner completes task
2. Reflection save is routed under that worker's registered workspace scope
3. If short reflection generation succeeds, include `Lesson` + entity tags
4. If reflection generation fails, save a basic reflection anyway (entities = empty)
5. Confidence assigned by outcome rules above
6. **Reflection is WRITE-ONCE — never modified by agent after creation**

### Constraints

- Reflection generation call must be < 500 tokens
- Failure to generate reflection must not crash execution
- No implicit writes to global case-bank
- Agent CANNOT modify or delete existing reflections
- Confidence field is informational only — no auto-promotion logic in this task
- Promotion to approved default knowledge repo is out of scope and must follow P2-42

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/case-bank.ts` |

## Done Criteria
- [ ] Saves reflection `.md` to workspace-scoped case bank
- [ ] Reflection contains workspace identity metadata
- [ ] Reflection includes entity tags (Entities, Files, Concepts)
- [ ] Reflection includes Confidence + Corroborations fields
- [ ] Confidence assigned by outcome rules (not hardcoded)
- [ ] Reflections are write-once (no modify/delete API exposed)
- [ ] No default global write path
- [ ] No promotion logic; P2-42 pipeline is referenced for future promotion
- [ ] Graceful fallback if reflection generation fails
- [ ] `npm run build` pass
