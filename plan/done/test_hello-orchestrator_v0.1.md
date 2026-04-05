# Test Plan: Hello Orchestrator

## Goal

Tạo 1 file `hello.md` trong root project với nội dung "Hello from Orchestrator!"
và update README.md thêm section "Orchestrator Status".

## Tasks

1. **01-create-hello** — Tạo file `hello.md` với content: "Hello from Orchestrator!"
2. **02-update-readme** — Update `README.md` thêm section "## Orchestrator Status\n\n✅ Running"
3. **03-verify-all** — Verify cả 2 files tồn tại và đúng nội dung (depends on task 1 + 2)

## DAG

```
Group 1: [01-create-hello, 02-update-readme]  (parallel, no deps)
Group 2: [03-verify-all]                       (depends on group 1)
```

## Expected Outcome

- 3 tasks created in inbox/
- Group 1 tasks execute in any order
- Group 2 task (03-verify-all) only executes after both group 1 tasks are done
- All 3 tasks end up in outbox/ with status "done"
- Checkpoint saved after each completion
- Full event log in exchange/logs/
