# Task 18: prompts/ folder — planner + worker prompt templates

## Info
- **ID:** 18-prompt-templates
- **Module:** prompts
- **Group:** 9
- **Dependencies:** none
- **Priority:** 2

## What to do

Tạo folder `prompts/` ở root với 3 files:

### 1. `prompts/README.md`
Hướng dẫn user cách copy-paste prompt vào IDE.

### 2. `prompts/planner-prompt.md`
Template cho Planner agent với:
- Role: Decomposer/Planner
- MCP Tools: check_plans, submit_decomposition
- Working directories
- 2-mode pattern (Operational/Execution)
- Loop protocol: loop cho tới hết plan hoặc user ngưng
- Idle behavior
- max_idle_loops slot (default ∞)
- Notes section

### 3. `prompts/worker-prompt.md`
Template cho Worker agent với:
- Role: Worker/Executor
- MCP Tools: get_next_task, complete_task, report_progress
- Working directories
- 2-mode pattern
- Loop protocol
- Role transition: nhận BECOME_PLANNER → chuyển mode
- max_idle_loops slot
- Notes section

## Files
| Action | Path |
|--------|------|
| NEW | `prompts/README.md` |
| NEW | `prompts/planner-prompt.md` |
| NEW | `prompts/worker-prompt.md` |

## Done Criteria
- [x] 3 files tạo xong
- [x] Prompts có đầy đủ sections theo TODO_FIXES #1
- [x] 2-mode pattern (Operational/Execution) rõ ràng
- [x] Role transition instructions
- [x] Human-readable, copy-paste friendly
