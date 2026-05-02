# Task EV09b: Prompt Enhancement — Session, Retry, Boot, Reflexion

## Info
- **ID:** EV09b-prompt-session-enhancement
- **Module:** prompts/
- **Group:** 2 (Workspace Memory Injection)
- **Dependencies:** EV08 (stale recovery), EV09 (session checkpoint)
- **Priority:** 9
- **Ref:** `prompt_review.md` v3 — Sections 3.1–3.5, 5, 6

## What to do

Patch `prompts/agent-prompt.md` với 6 enhancements dựa trên 2026 industry benchmark (Claude Code, Devin, LangGraph, Codex):

### 1. Boot sequence fix
- Merge Session Protocol vào **đầu** Section 1
- Section 1 phải nói: "Before connecting, check `.agent/session.json` for recovery state"
- Tham khảo: Claude Code deterministic boot sequence

### 2. Session schema spec
Thêm vào Session Protocol section:
```markdown
When calling session_checkpoint(save), include structured context:
- files_changed: list of files created or modified
- done_criteria_status: map of criterion → boolean
- last_action: human-readable description of last action
- phase: "pre-flight" | "implementation" | "verification" | "done"
- error_context: null or { error, hypothesis, attempted_fix }
```

### 3. Retry-aware pre-flight
Thêm vào Section W, **trước** Pre-flight:
```markdown
Recovery Check (before pre-flight):
- If task has retry_count > 0 → call session_checkpoint(load)
- If session matches task_id → skip completed steps, resume from last_action
- Before creating any file → check if file already exists (idempotency)
- If no matching session → treat as fresh start
```

### 4. Bounded reflexion loop
Replace vague "if fails → fix" trong Self-Validation:
```markdown
Self-Validation with Reflexion (MANDATORY):
1. Run verification → capture actual output
2. If PASS → proceed to complete_task
3. If FAIL:
   a. Diagnose: WHAT failed (exact error message)
   b. Hypothesize: WHY (wrong import? missing dep? path?)
   c. Apply targeted fix
   d. Re-run verification
   e. Max 2 fix attempts → then complete_task(status: "failed", summary: full diagnosis)
```

### 5. Graceful pause handler
```markdown
When user says "stop", "exit", or "pause":
1. Call session_checkpoint(save) with current progress
2. If mid-task → complete_task(status: "blocked", summary: "Paused by user")
3. Respond: "Session saved at <phase>. Resume with /resume-session."
```

### 6. Context-aware memory loading
```markdown
If .agent/workspace-memory.md exists:
- If file < 30KB: read entire file
- If file > 30KB: read only "## Project Overview" and "## Dependency Graph"
  Use scan_workspace tool for detailed info when needed.
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `prompts/agent-prompt.md` |

## Verification
```bash
# Manual review:
# 1. Read modified prompt — boot sequence references Session Protocol
# 2. Session schema defined with specific fields
# 3. Retry-aware section present in Section W
# 4. Reflexion loop has bounded retries (max 2)
# 5. Pause handler instructions present
# 6. Memory loading has size-aware branching
```

## Done Criteria
- [x] Session Protocol merged into Section 1 boot sequence
- [x] Session schema spec with 5 typed fields documented (task_id, phase, files_changed, done_criteria_status, last_action, error_context)
- [x] Retry-aware pre-flight in Section W (if retry_count > 0) — includes idempotency check + error_context avoidance
- [x] Bounded reflexion loop (max 2 retries → escalate with full diagnosis)
- [x] Graceful pause handler instructions (Section I)
- [x] Context-aware memory loading (30KB threshold) + scan_workspace fallback
- [x] ~70 lines added (455 → 525 = +70 lines, slightly over estimate but well-scoped)
- [x] BONUS: update_memory reference added for agent write-back (2026 standard)
