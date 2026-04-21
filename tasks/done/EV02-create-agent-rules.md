# Task EV02: Create .agent/rules/ Recovery Protocol

## Info
- **ID:** EV02-create-agent-rules
- **Module:** .agent/rules
- **Group:** 1 (AG Ecosystem Setup)
- **Dependencies:** none
- **Priority:** 2
- **Ref:** `dev-docs/plan_evolution-and-local-brain.md` — Phase 1, §1.2

## What to do

Tạo thư mục `.agent/rules/` và file recovery protocol. AG tự động đọc tất cả `.md` files trong `.agent/rules/` như contextual rules.

### [NEW] `.agent/rules/recovery-protocol.md`

```markdown
---
description: Protocol khi agent gặp error hoặc session bị gián đoạn
---

## Recovery Protocol
1. Khi start session mới, check `.agent/session.json` trước
2. Nếu file tồn tại → đây là resume session → đọc context + tiếp tục
3. Nếu file không tồn tại → session mới → proceed bình thường
4. Ghi `.agent/session.json` sau mỗi: file edit, tool call thành công, task completion
5. Khi hoàn thành task → xóa `.agent/session.json`
```

## Files
| Action | Path |
|--------|------|
| NEW    | `.agent/rules/recovery-protocol.md` |

## Verification
- [ ] Thư mục `.agent/rules/` tồn tại
- [ ] File recovery-protocol.md có YAML frontmatter hợp lệ
- [ ] Mở AG conversation → kiểm tra agent biết recovery protocol

## Done Criteria
- [ ] `.agent/rules/recovery-protocol.md` tồn tại với đúng nội dung
