# IDE Auto-Recovery & Session Management — Discussion Notes

> **Status**: 🟡 DISCUSSION (chưa implement, chờ migrate xong)
> **Date**: 2026-04-20
> **Participants**: User + Agent (independent research)

---

## Bài toán

Antigravity IDE (và tương lai: Cursor, Codex) hay bị stuck do server overload (503).
Cần hệ thống tự phục hồi mà **KHÔNG vi phạm TOS**.

Có 2 bài toán con:
1. **Stuck Recovery**: Agent bị terminated → cần retry/tạo session mới
2. **Context Overflow**: Conversation quá dài → cần reset session giữ state

---

## Policy & TOS Constraints

- ⛔ **KHÔNG** dùng Antigravity Ask Bridge (ddarkr) — truy cập internal RPC → ban
- ⛔ **KHÔNG** dùng `auto-all-Antigravity` extension — chứa malware
- ⚠️ CDP vào Electron process = vùng xám TOS
- ✅ OS-level automation (xdotool, accessibility) = an toàn
- ✅ CLI chính thức (`antigravity chat`) = an toàn
- ✅ Custom extension tự build = an toàn
- ✅ File watcher (`fs.watch` log files) = an toàn

---

## Phát hiện quan trọng

### 1. CLI `antigravity chat`
```bash
antigravity chat --mode agent -r "prompt"   # Mở chat, điền prompt, KHÔNG auto-submit
antigravity chat --mode agent -r -          # Đọc prompt từ stdin
antigravity chat --add-file src/a.ts        # Thêm context file
```
→ Cầu nối chính thức giữa orchestrator (Node.js) và IDE đóng.
→ **Hạn chế**: không auto-submit, cần nhấn Enter thêm.

### 2. Log file chứa error
```
~/.config/Antigravity/logs/<session>/cloudcode.log
→ "[error] Failed to make POST request: Resource has been exhausted"
```
→ Detect stuck bằng `fs.watch()` — zero deps, real-time, TOS-safe.

### 3. Internal chat commands (80+ commands)
```
workbench.action.chat.submit              # Gửi prompt
workbench.action.chat.newChat             # Chat mới
workbench.action.chat.openSessionWithPrompt # Mở + gửi luôn
workbench.action.chat.cancel              # Hủy
workbench.action.chat.acceptTool          # Chấp nhận tool
```
→ Chỉ gọi được từ **extension bên trong IDE**, không từ CLI.

---

## Solutions đã research

### Stuck Recovery — 5 approaches

| # | Solution | Detect | Action | TOS | Complexity |
|---|---|---|---|---|---|
| 1 | **File Watcher** (fs.watch log) | ✅ | ❌ | 🟢 | 🟢 Thấp |
| 2 | **Custom Extension** (VS Code API) | ✅ | ✅ | 🟢 | 🟡 TB |
| 3 | **Screen Automation** (xdotool + OCR) | ✅ | ✅ | 🟢 | 🟡 TB |
| 4 | **AT-SPI/D-Bus** (Accessibility API) | ✅ | ✅ | 🟢 | 🔴 Cao |
| 5 | **Virtual Input** (uinput/evdev) | ❌ | ✅ | 🟢 | 🔴 Cao |

**Đề xuất**: Solution 1 (detect) + Solution 2 (action)

### Context Overflow — 3 approaches

| Approach | Kiểu | Ý tưởng |
|---|---|---|
| **A: Graceful Shutdown** | Reactive | Agent tự checkpoint khi nhận warning |
| **B: External Kill** | Reactive | Orchestrator ép dừng + requeue |
| **C: Proactive Rotation** | Preventive | Token budget per task → task phải đủ nhỏ |

**Đề xuất**: Approach C + A (phòng ngừa + graceful)

### Session Management — 3 combos

| Combo | Create | Submit | Close | Effort |
|---|---|---|---|---|
| **CLI + xdotool** | `antigravity chat` | `xdotool key Return` | `xdotool key ctrl+w` | 🟢 Thấp |
| **CLI + micro extension** | `antigravity chat` | Extension `chat.submit` | Extension | 🟡 TB |
| **Full extension** | Extension full control | Extension | Extension | 🟡 TB |

---

## Hệ thống cần cài thêm

- `xdotool` — `sudo apt install xdotool` (nếu dùng combo 1)
- Máy đang chạy X11 ✅, Tesseract ✅, ImageMagick ✅

## Cross-IDE compatibility

| Feature | Antigravity | Cursor | Codex |
|---|---|---|---|
| CLI chat | ✅ `antigravity chat` | ❌ | ✅ API-based |
| Extension API | ✅ VS Code fork | ✅ VS Code fork | ❌ Cloud |
| xdotool | ✅ X11 | ✅ X11 | ❌ Cloud |
| Headless | ❌ | ❌ | ✅ Native |

---

## Implementation Phases (khi sẵn sàng)

### Phase 1: Foundation
- [ ] Thêm turn counter vào `worker-registry.ts`
- [ ] Thêm `MAX_TURNS_PER_SESSION` vào `constants.ts`
- [ ] File watcher cho `cloudcode.log`
- [ ] `context_overflow` status trong task lifecycle

### Phase 2: CLI Integration
- [ ] Node.js wrapper cho `antigravity chat --mode agent -r`
- [ ] Auto-submit mechanism (xdotool hoặc micro extension)
- [ ] Session close mechanism

### Phase 3: Full Auto-Recovery
- [ ] Orchestrator detect stuck → create new session → resend prompt
- [ ] Context snapshot trong `complete_task`
- [ ] Proactive session rotation (token budget)

---

## Tài liệu tham khảo (trong conversation artifacts)

- `policy_risk_assessment.md` — Đánh giá rủi ro TOS chi tiết
- `human_simulator_solutions.md` — 5 solutions so sánh
- `context_overflow_solutions.md` — 3 chiều giải quyết context overflow
- `ide_entry_points.md` — Bản đồ cửa vào IDE đóng
