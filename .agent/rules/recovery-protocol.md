---
description: Protocol khi agent gặp error hoặc session bị gián đoạn
---

## Recovery Protocol
1. Khi start session mới, check `.agent/session.json` trước
2. Nếu file tồn tại → đây là resume session → đọc context + tiếp tục
3. Nếu file không tồn tại → session mới → proceed bình thường
4. Ghi `.agent/session.json` sau mỗi: file edit, tool call thành công, task completion
5. Khi hoàn thành task → xóa `.agent/session.json`
