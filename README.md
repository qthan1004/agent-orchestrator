# 🤖 Agent Orchestrator

> Standalone AI Agent Orchestrator — Auto-Tasking engine with DAG-based dependency management, multi-session coordination, and file-based state machine.

[![Node.js](https://img.shields.io/badge/Node.js-≥18-green)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)]()
[![MCP](https://img.shields.io/badge/Protocol-MCP-blue)]()
[![Status](https://img.shields.io/badge/Status-v0.2.0-orange)]()

---

## 📖 Mục lục

- [Tổng quan](#-tổng-quan)
- [Tính năng chính](#-tính-năng-chính)
- [Kiến trúc](#️-kiến-trúc)
- [Cài đặt](#-cài-đặt)
- [Kết nối Antigravity IDE](#-kết-nối-antigravity-ide)
- [Kiểm tra kết nối](#-kiểm-tra-kết-nối)
- [Cách sử dụng](#-cách-sử-dụng)
- [MCP Tools Reference](#️-mcp-tools-reference)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Brain Watcher (Desktop Notifications)](#-brain-watcher-desktop-notifications)
- [Xử lý lỗi & Recovery](#-xử-lý-lỗi--recovery)
- [CLI & Utility Scripts](#-cli--utility-scripts)
- [Tech Stack](#-tech-stack)

---

## 🌟 Tổng quan

**Agent Orchestrator** là một server chạy trên máy tính cá nhân (localhost), đóng vai trò **"bộ não trung tâm"** điều phối các AI Agent hoạt động trong IDE Antigravity.

**Bài toán:** Bạn muốn AI tự động làm việc — đọc yêu cầu, chia nhỏ, code, test, báo cáo — mà bạn chỉ cần mô tả yêu cầu.

**Giải pháp:** Bạn viết yêu cầu vào file `.md` → bỏ vào thư mục `plan/pending/` → hệ thống **tự động** phân tích, chia task, phân phối cho AI Agents, và thu kết quả.

---

## ✨ Tính năng chính

| Tính năng | Mô tả |
|-----------|-------|
| 🔄 **Auto-Tasking Engine** | Tự phân tách plan → task, sắp xếp phụ thuộc (DAG), phân phối cho AI |
| 📡 **MCP Server** | Giao tiếp real-time với AI Agent qua Model Context Protocol |
| 🧠 **Multi-Session** | Nhiều AI Agent chạy song song trên cùng 1 máy |
| 📁 **File-based State** | State machine qua filesystem: `pending/` → `processing/` → `done/` |
| 💾 **Checkpoint & Recovery** | Auto-save trạng thái, tự phục hồi khi crash |
| ⚡ **Long Polling** | Server giữ kết nối, push ngay khi có task mới |
| 🔄 **Dynamic Role Switching** | Agent tự chuyển vai trò Planner ↔ Worker theo chỉ thị server |
| 🔔 **Brain Watcher** | Monitor background, gửi desktop notification khi agent bị stuck |
| 🩺 **Session Checkpoint v2** | Lưu error diagnosis cho intelligent retry |

---

## 🏗️ Kiến trúc

```
┌──────────────────────────────────────────────────────────────┐
│                      MÁY TÍNH CỦA BẠN                        │
│                                                                │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐      │
│  │  Antigravity  │   │  Antigravity  │   │  Antigravity  │      │
│  │  Cửa sổ 1     │   │  Cửa sổ 2     │   │  Cửa sổ 3     │      │
│  │  (Agent A)    │   │  (Agent B)    │   │  (Agent C)    │      │
│  └──────┬────────┘   └──────┬────────┘   └──────┬────────┘      │
│         │ MCP                │ MCP                │ MCP           │
│         ▼                    ▼                    ▼                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │        ORCHESTRATOR SERVER (http://127.0.0.1:3847)    │       │
│  │                                                       │       │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │       │
│  │  │Task Queue│ │  State   │ │ Recovery │ │ Brain  │  │       │
│  │  │  (DAG)   │ │ Manager  │ │  Module  │ │Watcher │  │       │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘  │       │
│  └──────────────────────────────────────────────────────┘       │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                 FILE SYSTEM (IPC)                      │       │
│  │  exchange/   plan/   tasks/   .agent/session.json     │       │
│  └──────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────┘
```

### Cách hoạt động (5 bước)

1. **Bạn** viết yêu cầu → bỏ file `.md` vào `plan/pending/`
2. **Server** phát hiện file mới → giao cho Agent đóng vai **Planner**
3. **Planner** chia nhỏ plan thành task với DAG dependency → đẩy vào queue
4. **Workers** tự bốc task → thực thi → báo cáo kết quả
5. **Kết quả** lưu tại `exchange/outbox/` và log tại `exchange/logs/`

---

## 🚀 Cài đặt

### Yêu cầu

| Phần mềm | Phiên bản | Tải về |
|-----------|-----------|--------|
| Node.js   | ≥ 18      | https://nodejs.org |
| Git       | Bất kỳ    | https://git-scm.com |
| Antigravity IDE | Mới nhất | Cài sẵn |

### Bước 1: Clone và cài đặt

```bash
git clone https://github.com/qthan1004/agent-orchestrator.git
cd agent-orchestrator
npm install
```

### Bước 2: Build TypeScript

```bash
npm run build
```

> Project đã chuyển sang TypeScript (v0.2.0). Source code nằm trong `src/`, build output nằm trong `dist/`.

### Bước 3: Khởi động Server

```bash
npm run serve
```

Server hỏi cấu hình — nhấn **Enter** để dùng mặc định (khuyến nghị):

```
🚀 MCP Orchestrator Setup
────────────────────────
? Configuration (default/custom) [default]:
```

**Cấu hình mặc định:**

| Tham số | Giá trị | Ý nghĩa |
|---------|---------|---------|
| Port | `3847` | Cổng server |
| Stale threshold | `90s` | Worker treo > 90s = stale |
| Long poll timeout | `30s` | Chờ task tối đa 30s |
| Plan watcher | `30s` | Quét `plan/pending/` mỗi 30s |

Khi thấy `🚀 Server is running on port 3847` → **server đã sẵn sàng**.

> [!IMPORTANT]
> **Đừng tắt Terminal này!** Server phải chạy liên tục. Nếu tắt → tất cả Agent mất kết nối.

### Chế độ Development (tùy chọn)

Nếu bạn đang phát triển orchestrator, dùng `npm run dev` thay cho `npm run build && npm run serve`. Nó chạy TypeScript trực tiếp bằng `tsx`, không cần build.

---

## 🔗 Kết nối Antigravity IDE

### Bước 1: Mở file cấu hình MCP

Tìm file `mcp_config.json` tại:

| OS | Đường dẫn |
|----|-----------|
| **Windows** | `C:\Users\<TenBan>\.gemini\antigravity\mcp_config.json` |
| **Linux/macOS** | `~/.gemini/antigravity/mcp_config.json` |

### Bước 2: Thêm cấu hình Orchestrator

**Nếu file chưa tồn tại** → tạo mới:

```json
{
  "mcpServers": {
    "orchestrator": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://127.0.0.1:3847/mcp",
        "--transport",
        "http-first"
      ]
    }
  }
}
```

**Nếu file đã có** `mcpServers` → thêm key `"orchestrator"` vào bên trong.

> [!IMPORTANT]
> File `mcp_config.json` dùng chung cho **tất cả cửa sổ Antigravity**. Chỉ cần cấu hình **1 lần**.

### Bước 3: Restart Antigravity

Đóng **tất cả cửa sổ** Antigravity rồi mở lại (hoặc Ctrl+Shift+P → "Reload Window").

---

## ✅ Kiểm tra kết nối

### Cách 1: Health Check script

```bash
node reference/tools/health-check.mjs
```

Kết quả ghi vào `exchange/.tmp/health.md` — ✅ Running = OK.

### Cách 2: Hỏi AI trong Antigravity

Mở chat Antigravity và nhắn:

> "Gọi `hello_world` với name 'test' cho tôi"

Nếu AI trả lời `"Hello, test! MCP Orchestrator is running."` → **Kết nối thành công** ✅

---

## 📝 Cách sử dụng

### Quick Start — Mỗi lần làm việc

```
1. Mở Terminal → npm run serve               ← Server chạy nền
2. Mở Antigravity → paste prompt             ← Agent khởi động
3. Bỏ file .md vào plan/pending/             ← GIAO VIỆC
4. Đi uống cà phê ☕                          ← Agent tự làm
```

### Bước 1: Khởi động Agent

Mở chat AI trong Antigravity, nhắn:

```
Bạn hãy đọc file prompts/agent-prompt.md trong project này và làm theo hướng dẫn trong đó.
Bắt đầu bằng việc gọi register_worker().
```

Agent sẽ tự đăng ký, nhận vai trò (Planner/Worker/Idle), và bắt đầu loop.

### Bước 2: Tạo plan (yêu cầu công việc)

Tạo file `.md` trong `plan/pending/`:

```markdown
# Tính năng đăng nhập

## Yêu cầu
- Tạo trang login với form email/password
- Validate input
- Kết nối API backend

## Chi tiết
- File frontend: src/pages/Login.vue
- Cần viết unit test
```

> [!TIP]
> Đặt tên file có timestamp để đảm bảo thứ tự FIFO: `2026-05-01_feature-login.md`

### Bước 3: Không có bước 3

Hệ thống **tự động**:
- Planner phát hiện plan → phân tích → chia task → đẩy vào queue
- Worker(s) tự bốc task → thực thi → hoàn thành → bốc tiếp

### Flow tổng thể

```
plan/pending/xxx.md                          ← Bạn bỏ file vào đây
       │
       ▼ Server phát hiện
plan/processing/xxx.md
       │
       ▼ Planner decompose → submit_decomposition()
plan/done/xxx.md  +  Tasks vào exchange/inbox/
                            │
                            ▼ Worker(s) bốc task
                       exchange/active/task-XX.json
                            │
                            ▼ Worker hoàn thành
                       exchange/outbox/result-XX.json  ← KẾT QUẢ
```

### Multi-Session (nhiều Agent song song)

> [!WARNING]
> **Khuyến nghị dùng 1 Agent** cho ổn định nhất. Multi-session có thể bị rate limit.

Mở **thêm cửa sổ Antigravity** (Ctrl+Shift+N) → paste cùng prompt → Agent mới sẽ tự đăng ký với `worker_id` riêng.

Server **tự phân vai**:
- Agent đầu tiên có plan pending → **Planner**
- Agent tiếp theo có task trong queue → **Worker**
- Không có gì → **Idle** (chờ long-poll)

Khi Planner xong tất cả plan → tự chuyển sang Worker → tất cả Agent làm song song.

### Xem kết quả

| Nơi xem | Đường dẫn | Nội dung |
|---------|-----------|----------|
| Kết quả task | `exchange/outbox/result-<id>.json` | Status, summary, worker_id, timestamp |
| Log hàng ngày | `exchange/logs/YYYY-MM-DD.md` | Timeline sự kiện (assigned, progress, completed) |
| Queue status | Gọi `get_queue_status()` trong chat | Số task pending/active/done |

---

## 🛠️ MCP Tools Reference

### Tools chung (mọi Agent)

| Tool | Chức năng | Tham số |
|------|----------|---------|
| `hello_world` | Test kết nối | `name` |
| `register_worker` | Đăng ký Agent, nhận `worker_id` + `role` | `workspace_path?` |
| `get_status` | Xem server info (version, uptime, workers) | — |
| `get_queue_status` | Xem tổng quan queue | — |
| `get_checkpoint` | Lưu checkpoint queue | — |
| `get_template` | Lấy template chuẩn | `template_name` |
| `ping` | Heartbeat giữ session alive | `worker_id` |
| `scan_workspace` | Quét workspace → tạo workspace-memory.md | `force_update?` |
| `session_checkpoint` | Save/Load/Clear session state (v2: có error_context) | `action`, `task_id?`, `phase?`, `files_changed?`, `done_criteria_status?`, `last_action?`, `error_context?` |

### Tools Worker

| Tool | Chức năng | Tham số |
|------|----------|---------|
| `get_next_task` | Long-poll lấy task (chờ tối đa 30s) | `worker_id` |
| `complete_task` | Báo hoàn thành task | `task_id`, `status`, `summary`, `worker_id`, `auto_pickup?` |
| `report_progress` | Báo tiến độ | `task_id`, `step`, `percentage`, `worker_id` |

### Tools Planner

| Tool | Chức năng | Tham số |
|------|----------|---------|
| `check_plans` | Long-poll quét plan/pending/ (chờ 60s) | — |
| `submit_decomposition` | Nộp task list + DAG graph | `tasks[]`, `graph`, `reasoning`, `source_plan`, `worker_id?` |

### Tools quản trị

| Tool | Chức năng | Tham số |
|------|----------|---------|
| `request_retry` | Requeue task bị lỗi (max 3 lần) | `task_id`, `reason`, `attempt` |
| `force_release_task` | Giải phóng task bị kẹt | `task_id`, `reason` |

### Task format khi submit

```json
{
  "id": "01-create-login",
  "module": "src/pages",
  "action": "Tạo trang login với form email/password",
  "verification": "npm test -- --grep login"
}
```

### DAG Graph format

```json
{
  "groups": [
    { "group_id": 1, "tasks": ["01-create-login"], "depends_on": [] },
    { "group_id": 2, "tasks": ["02-add-validation"], "depends_on": [1] },
    { "group_id": 3, "tasks": ["03-write-tests"], "depends_on": [2] }
  ]
}
```

- Task cùng group → **song song**
- Group phải hoàn thành trước group phụ thuộc
- **Tối đa 20 task** mỗi lần submit

---

## 📂 Cấu trúc thư mục

```
agent-orchestrator/
├── src/                          ← 🔧 Source code (TypeScript)
│   ├── index.ts                  ← CLI entry point
│   ├── config.ts                 ← Config + paths
│   ├── constants.ts              ← Hằng số hệ thống
│   ├── models/                   ← Type definitions
│   ├── mcp-server/               ← MCP Server core
│   │   ├── tools.ts              ← Tool definitions
│   │   ├── tools/                ← Modular tool handlers
│   │   │   ├── scan-workspace.ts
│   │   │   └── session-checkpoint.ts
│   │   ├── state-manager.ts      ← File state machine
│   │   ├── task-queue.ts         ← DAG-based queue
│   │   ├── recovery.ts          ← Auto-recovery module
│   │   ├── plan-watcher.ts       ← Quét plan/pending/
│   │   ├── poll-helpers.ts       ← Long polling logic
│   │   ├── idle-resolver.ts      ← Idle/promote decisions
│   │   ├── transport.ts          ← Streamable HTTP
│   │   └── server.ts             ← Express server
│   ├── agents/                   ← Agent-specific modules
│   │   └── antigravity/          ← Antigravity IDE integration
│   │       ├── brain-watcher.ts  ← Monitor stuck sessions
│   │       ├── notifications.ts  ← Desktop notifications
│   │       ├── config-resolver.ts
│   │       └── constants.ts
│   └── utils/                    ← Helpers (logger, file-backend, etc.)
│
├── dist/                         ← 📦 Build output (npm run build)
├── prompts/                      ← 📋 Agent prompt templates
│   └── agent-prompt.md           ← Prompt chuẩn cho Agent
│
├── plan/                         ← 📝 Kế hoạch của bạn
│   ├── pending/                  ← ⬜ BỎ FILE .MD VÀO ĐÂY
│   ├── processing/               ← 🔄 Đang decompose (tối đa 1)
│   └── done/                     ← ✅ Đã xong
│
├── exchange/                     ← 📁 File IPC
│   ├── inbox/                    ← 📥 Task chờ
│   ├── active/                   ← 🔄 Task đang làm
│   ├── outbox/                   ← 📤 KẾT QUẢ
│   ├── logs/                     ← 📋 Nhật ký (YYYY-MM-DD.md)
│   ├── checkpoints/              ← 💾 Backup tự động
│   ├── _queue.json               ← DAG structure
│   └── workers.json              ← Worker registry
│
├── reference/                    ← 📦 Đi kèm product
│   ├── tools/                    ← Health check, queue status scripts
│   ├── skills/                   ← Skills cho agent (planner-protocol, etc.)
│   └── context/                  ← Tài liệu context
│
├── templates/                    ← 📄 JSON/MD templates chuẩn
├── tests/                        ← 🧪 E2E tests
├── dev-docs/                     ← 📝 Tài liệu dev (không ship)
├── tasks/                        ← 🔧 Dev task board (không ship)
├── tsconfig.json                 ← TypeScript config
└── package.json
```

---

## 🔔 Brain Watcher (Desktop Notifications)

Brain Watcher là service chạy nền, theo dõi file trạng thái conversation của Antigravity. Khi phát hiện agent bị "stuck" (không hoạt động quá lâu), nó gửi **desktop notification** để bạn biết.

### Khởi động

```bash
npm run watch:ag
```

Service sẽ:
- Monitor thư mục brain data của Antigravity
- Phát hiện conversation files không thay đổi quá threshold
- Gửi desktop notification qua `node-notifier`
- Graceful shutdown với Ctrl+C

> [!TIP]
> Chạy `watch:ag` song song với `npm run serve` trong terminal riêng.

---

## 🔧 Xử lý lỗi & Recovery

### Lỗi thường gặp

#### ❌ `EADDRINUSE: address already in use`

Port 3847 đang bị chiếm. Giải pháp:

```bash
# Đổi port
node dist/index.js serve --port 4000

# Hoặc tắt process đang chiếm (Windows PowerShell)
netstat -ano | findstr :3847
taskkill /PID <PID> /F
```

> Nếu đổi port → cập nhật URL trong `mcp_config.json` → restart Antigravity.

#### ❌ Antigravity không thấy tool nào

Kiểm tra theo thứ tự:
1. Server đang chạy? → Terminal phải hiện `🚀 Server is running`
2. `mcp_config.json` đúng path?
3. URL đúng? → `http://127.0.0.1:3847/mcp` (phải có `/mcp`)
4. JSON hợp lệ? → Không thiếu dấu phẩy, ngoặc
5. Đã restart Antigravity?

#### ❌ Task bị kẹt trong `exchange/active/`

Nhắn AI: *"Gọi `force_release_task` với task_id: 'XX', reason: 'Worker crashed'"*

### Retry task bị lỗi

Nhắn AI: *"Task XX bị lỗi, gọi `request_retry` với task_id, reason, attempt"*

> [!WARNING]
> Mỗi task retry tối đa **3 lần**. Vượt quá → permanently failed.

### Recovery tự động

| Tình huống | Xử lý |
|------------|--------|
| Server crash → restart | Quét orphan task trong `active/` → requeue |
| Worker treo > 90s | Đánh dấu stale, requeue cho worker khác |
| Tắt đột ngột | Phát hiện unclean shutdown → full recovery scan |
| Task failed/blocked | Auto-requeue với retry count + error_context |

### Session Checkpoint (v2)

Khi task fail, hệ thống lưu `error_context` vào `.agent/session.json`:

```json
{
  "error_context": {
    "error": "Cannot find module 'xyz'",
    "hypothesis": "Missing dependency",
    "attempted_fix": "Added import statement",
    "retry_count": 1
  }
}
```

Agent mới nhận retry sẽ đọc diagnosis này → tránh lặp lại cùng fix → thử approach khác.

---

## 💻 CLI & Utility Scripts

### Server commands

```bash
# Production (cần build trước)
npm run build
npm run serve

# Development (TypeScript trực tiếp)
npm run dev

# Brain Watcher
npm run watch:ag

# Type check
npm run typecheck
```

### Utility Scripts

Chạy từ project root:

| Script | Chức năng | Output |
|--------|----------|--------|
| `node reference/tools/health-check.mjs` | Check server status | `exchange/.tmp/health.md` |
| `node reference/tools/queue-status.mjs` | Đếm tasks | `exchange/.tmp/queue-status.md` |
| `node reference/tools/task-scanner.mjs` | Chi tiết metadata tasks | `exchange/.tmp/task-scan.md` |
| `node reference/tools/init-exchange.mjs` | Tạo cấu trúc exchange/ | Console |
| `node reference/tools/reset-exchange.mjs` | Xoá data exchange/ (giữ cấu trúc) | Console |

---

## 📦 Tech Stack

| Thành phần | Công nghệ |
|-----------|----------|
| Language | TypeScript 5.8 (strict mode) |
| Runtime | Node.js ≥ 18 (Pure ESM) |
| Protocol | MCP — Streamable HTTP |
| Framework | Express 5 |
| Validation | Zod 4 |
| MCP SDK | `@modelcontextprotocol/sdk` |
| Transport | `mcp-remote` (npx → HTTP bridge) |
| Notifications | `node-notifier` |
| Dev runner | `tsx` (TypeScript execution) |

---

## 💡 Mẹo cho người mới

> [!TIP]
> - **Ban đầu**: Thử plan đơn giản (2-3 task nhỏ) để làm quen
> - **Kiểm tra**: Gọi `get_queue_status()` trước khi giao task mới
> - **Đọc log**: `exchange/logs/YYYY-MM-DD.md` để hiểu chuyện gì đang xảy ra
> - **1 cửa sổ là đủ** cho hầu hết trường hợp
> - Nếu "im lặng" quá lâu → `get_status()` kiểm tra server

---

## 📄 License

MIT
