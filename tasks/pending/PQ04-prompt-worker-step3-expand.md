# Task PQ04: Expand Worker Step 3 — Pre-flight + Self-Validation

## Info
- **ID:** PQ04-prompt-worker-step3-expand
- **Module:** prompts
- **Group:** 2 (Prompt — Worker)
- **Dependencies:** none
- **Priority:** 4
- **Plan ref:** `dev-docs/plan_improve-planner-task-quality_from-test-4.5.md` → "Change 2"

## What to do

### Goal
Expand Section W (Worker protocol) Step 3 và Step 4 trong `prompts/agent-prompt.md`. Thêm structured sub-protocol: Pre-flight, Implementation, Self-Validation.

### Nội dung thay thế

**Replace** step 3 `[Mode B] Read task_details...` và step 4 `Verify...` với:

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

### Constraints
- Đọc file `prompts/agent-prompt.md` trước — tìm chính xác vị trí Section W Step 3 và 4
- Giữ nguyên Step 1, 2 của Section W
- Step 4 mới ngắn hơn — chỉ nhắc heartbeat

## Files
| Action | Path |
|--------|------|
| MODIFY | `prompts/agent-prompt.md` |

## Verification
```bash
# Keywords check
grep -c "Pre-flight" prompts/agent-prompt.md
grep -c "Self-Validation" prompts/agent-prompt.md
grep -c "PLAN DEVIATION" prompts/agent-prompt.md
grep -c "report_progress" prompts/agent-prompt.md
```

## Done Criteria
- [ ] Pre-flight section có 3 bullet points
- [ ] Implementation section có 3 bullet points
- [ ] Self-Validation section có 3 numbered steps
- [ ] CRITICAL callout block có trong step 3
- [ ] Step 4 mention `report_progress` và `> 60 seconds`
- [ ] Section W Step 1, 2 không bị thay đổi
