# 🤖 Agent Orchestrator

> Standalone AI Agent Orchestrator — Auto-Tasking engine with DAG-based dependency management, multi-session coordination, and file-based state machine.

[![Node.js](https://img.shields.io/badge/Node.js-≥18-green)]()
[![MCP](https://img.shields.io/badge/Protocol-MCP-blue)]()
[![Status](https://img.shields.io/badge/Status-Beta-orange)]()

---

## 📖 Mục lục

- [Tính năng chính](#-tính-năng-chính)
- [Kiến trúc tổng quan](#️-kiến-trúc-tổng-quan)
- [Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [Cài đặt và Khởi động](#-cài-đặt-và-khởi-động)
- [Kết nối Antigravity với Server](#-kết-nối-antigravity-với-server)
- [Kiểm tra Server](#-kiểm-tra-server)
- [Hướng dẫn Multi-Session (2+ cửa sổ Antigravity)](#️-hướng-dẫn-multi-session-2-cửa-sổ-antigravity)
- [Cách giao Task cho hệ thống](#-cách-giao-task-cho-hệ-thống)
- [MCP Tools Reference](#️-mcp-tools-reference)
- [Prompt Template cho Agent](#-prompt-template-cho-agent)
- [Xem kết quả ở đâu?](#-xem-kết-quả-ở-đâu)
- [Xử lý lỗi](#-xử-lý-lỗi)
- [Recovery tự động](#️-recovery-tự-động)
- [Quick Start — Tổng hợp](#-quick-start--tổng-hợp)
- [CLI Reference](#-cli-reference)
- [Utility Scripts](#-utility-scripts)
- [Tech Stack](#-tech-stack)

---

## ✨ Tính năng chính

- **🔄 Auto-Tasking Engine** — Tự động phân tách plan thành task, sắp xếp phụ thuộc (DAG), phân phối cho AI Workers
- **📡 MCP Server** — Giao tiếp real-time với AI Agent qua Model Context Protocol (Streamable HTTP)
- **🧠 Multi-Session** — Nhiều AI Agent chạy song song (Planner + Workers) trên cùng 1 máy
- **📁 File-based State Machine** — Plan flow: `pending/` → `processing/` → `done/`
- **💾 Checkpoint & Recovery** — Auto-save trạng thái, tự phục hồi khi crash
- **⚡ Long Polling** — Agent không cần poll liên tục, server giữ kết nối và push khi có task mới
- **🔄 Dynamic Role Switching** — Agent tự động chuyển vai trò (Planner ↔ Worker) theo chỉ thị server
- **📊 Task Board** — Dashboard tổng hợp tiến độ real-time

---

## 🏗️ Kiến trúc tổng quan

```
┌──────────────────────────────────────────────────────────────────┐
│                        MÁY TÍNH CỦA BẠN                         │
│                                                                  │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐       │
│   │  Antigravity  │   │  Antigravity  │   │  Antigravity  │       │
│   │  Cửa sổ 1     │   │  Cửa sổ 2     │   │  Cửa sổ 3     │       │
│   │  (Agent A)    │   │  (Agent B)    │   │  (Agent C)    │       │
│   └──────┬────────┘   └──────┬────────┘   └──────┬────────┘       │
│          │  MCP               │  MCP               │  MCP          │
│          ▼                    ▼                    ▼               │
│   ┌──────────────────────────────────────────────────────┐       │
│   │          ORCHESTRATOR SERVER (npm run serve)          │       │
│   │          http://127.0.0.1:3847/mcp                   │       │
│   │                                                      │       │
│   │   ┌────────────┐ ┌────────────┐ ┌───────────────┐   │       │
│   │   │ Task Queue │ │   State    │ │   Recovery    │   │       │
│   │   │    (DAG)   │ │  Manager   │ │   Module      │   │       │
│   │   └────────────┘ └────────────┘ └───────────────┘   │       │
│   └──────────────────────────────────────────────────────┘       │
│                              ▼                                    │
│   ┌──────────────────────────────────────────────────────┐       │
│   │                  FILE SYSTEM (IPC)                    │       │
│   │   exchange/     plan/        tasks/                  │       │
│   │   {inbox, active, outbox}   {pending, done}          │       │
│   └──────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────┘
```

### Cách hoạt động

1. **Bạn** viết yêu cầu (plan) → bỏ file `.md` vào thư mục `plan/pending/`
2. **Server** phát hiện file mới → giao cho Agent đóng vai **Planner** phân tích
3. **Planner** chia nhỏ plan thành task với DAG dependency → đẩy vào queue
4. **Workers** (1 hoặc nhiều cửa sổ Antigravity) tự bốc task → thực thi → báo cáo
5. **Kết quả** lưu tại `exchange/outbox/` và log tại `exchange/logs/`

> [!IMPORTANT]
> Server chạy như một **web server cục bộ** trên máy bạn (localhost). Tất cả các cửa sổ Antigravity nói chuyện với **cùng 1 server này** qua giao thức MCP → đây là cách chúng phối hợp được với nhau.

---

## 📂 Cấu trúc thư mục

```
agent-orchestrator/
├── src/                      ← ⚙️ Mã nguồn server (KHÔNG CẦN SỬA)
│   ├── index.mjs             ← CLI entry point
│   ├── config.mjs            ← Config + paths (cross-platform)
│   ├── constants.mjs         ← Các hằng số hệ thống
│   ├── mcp-server/           ← MCP Server layer (Streamable HTTP)
│   │   ├── tools.mjs         ← Tất cả MCP tool definitions
│   │   ├── state-manager.mjs ← Quản lý state chuyển file giữa dirs
│   │   ├── task-queue.mjs    ← DAG-based task queue
│   │   ├── plan-watcher.mjs  ← Quét plan/pending/ liên tục
│   │   ├── recovery.mjs      ← Tự phục hồi khi crash
│   │   ├── poll-helpers.mjs  ← Long polling cho task/plan
│   │   ├── idle-resolver.mjs ← Logic quyết định idle/promote
│   │   ├── transport.mjs     ← Streamable HTTP transport
│   │   └── server.mjs        ← Express server setup
│   └── utils/                ← Helpers
│       ├── startup-prompt.mjs ← Interactive config prompt
│       ├── worker-registry.mjs ← Quản lý worker sessions
│       ├── file-backend.mjs  ← File I/O operations
│       ├── logger.mjs        ← Structured logging
│       └── bootstrap.mjs     ← Directory initialization
│
├── prompts/                  ← 📋 Agent prompt templates
│   └── agent-prompt.md       ← Unified prompt (Dynamic Role Switching)
│
├── plan/                     ← 📝 Kế hoạch của bạn
│   ├── pending/              ← ⬜ BỎ FILE .md MỚI VÀO ĐÂY
│   ├── processing/           ← 🔄 Đang được Planner decompose (tối đa 1)
│   └── done/                 ← ✅ Plan đã xong (lưu trữ)
│
├── exchange/                 ← 📁 File IPC — Data Provider Layer
│   ├── inbox/                ← 📥 Task mới vào đây
│   ├── active/               ← 🔄 Task đang được Worker làm
│   ├── outbox/               ← 📤 Task đã xong (KẾT QUẢ Ở ĐÂY!)
│   ├── logs/                 ← 📋 Nhật ký theo ngày (YYYY-MM-DD.md)
│   ├── checkpoints/          ← 💾 Bản sao lưu tự động
│   ├── _queue.json           ← 🗂️ Cấu trúc DAG (thứ tự task)
│   └── workers.json          ← 👥 Registry các worker đang hoạt động
│
├── tasks/                    ← 📊 Task lifecycle tracking
│   ├── pending/              ← ⬜ Task đang chờ
│   ├── processing/           ← 🔄 Task đang xử lý
│   └── done/                 ← ✅ Task đã hoàn tất
│
├── reference/                ← 📦 Ships with product (đi kèm orchestrator)
│   ├── tools/                ← Script vận hành (health-check, queue-status...)
│   ├── skills/               ← Skills cho agents khi dùng orchestrator
│   ├── context/              ← Tài liệu context project
│   └── workflows/            ← (Reserved)
│
├── templates/                ← 📄 JSON contract templates
│   ├── task.template.json    ← Cấu trúc chuẩn 1 task
│   ├── checkpoint.template.json
│   ├── plan-output.template.json
│   └── archive-entry.template.json
│
└── .agent/                   ← 🔧 Dev-only (KHÔNG ship với product)
    ├── skills/               ← Dev skills (git-commit, token-optimization)
    ├── workflows/            ← Dev workflows (slash commands)
    └── tools/                ← Dev tools (git-push, task-board...)
```

---

## 🚀 Cài đặt và Khởi động

### Yêu cầu hệ thống

| Phần mềm | Phiên bản | Tải về |
|-----------|-----------|--------|
| Node.js   | ≥ 18.x   | https://nodejs.org |
| Git       | Bất kỳ    | https://git-scm.com |
| Antigravity IDE | Phiên bản mới nhất | Cài sẵn |

Kiểm tra:

```bash
node -v    # Phải hiện v18.x.x trở lên
git --version
```

### Bước 1: Tải mã nguồn

```bash
git clone https://github.com/qthan1004/agent-orchestrator.git
cd agent-orchestrator
```

### Bước 2: Cài thư viện

```bash
npm install
```

> Lệnh này sẽ tải về tất cả phần mềm phụ trợ (Express 5, Zod, MCP SDK...). Chờ 1-2 phút.

### Bước 3: Khởi động Server

```bash
npm run serve
```

Server sẽ hỏi bạn cấu hình:

```
🚀 MCP Orchestrator Setup
────────────────────────

? Configuration (default/custom) [default]:
```

- Nhấn **Enter** để dùng cấu hình mặc định (khuyến nghị)
- Gõ `custom` nếu muốn tùy chỉnh port, timeout, etc.

**Cấu hình mặc định:**

| Tham số | Giá trị | Ý nghĩa |
|---------|---------|---------|
| Port | `3847` | Cổng server |
| Stale threshold | `30 min` | Worker không heartbeat > 30 phút = stale |
| Long poll timeout | `30 sec` | Server giữ kết nối tối đa 30s khi chờ task |
| Plan watcher | `30 sec` | Quét `plan/pending/` mỗi 30s |

Nếu thành công:

```
🚀 Server is running on port 3847
```

> [!IMPORTANT]
> **Đừng tắt Terminal này!** Cửa sổ Terminal chạy server phải mở liên tục. Đây là "bộ não" của hệ thống. Nếu tắt → tất cả Agent mất kết nối. Mở thêm Terminal mới nếu cần gõ lệnh khác.

---

## 🔗 Kết nối Antigravity với Server

### Bước 1: Mở file cấu hình MCP

Tìm file `mcp_config.json` tại:

| Hệ điều hành | Đường dẫn |
|--------------|-----------|
| **Windows** | `C:\Users\<TenBan>\.gemini\antigravity\mcp_config.json` |
| **Linux** | `~/.gemini/antigravity/mcp_config.json` |
| **macOS** | `~/.gemini/antigravity/mcp_config.json` |

> Thay `<TenBan>` bằng tên user của bạn (ví dụ: `Quoc Thanh`)

### Bước 2: Thêm cấu hình Orchestrator

Nếu **file chưa tồn tại** → tạo mới với nội dung:

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

Nếu **file đã có nội dung** `mcpServers` → chỉ cần thêm phần `"orchestrator": {...}` vào bên trong object `mcpServers`:

```json
{
  "mcpServers": {
    "other-server": { "..." },
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

> [!IMPORTANT]
> File `mcp_config.json` được **tất cả cửa sổ Antigravity dùng chung**. Bạn chỉ cần cấu hình **1 lần duy nhất**. Mọi cửa sổ mới mở ra sẽ tự động kết nối đến server.

### Bước 3: Restart Antigravity

- **Đóng tất cả cửa sổ** Antigravity hoàn toàn rồi mở lại
- Hoặc dùng tính năng **Reload Extension/Window** (Ctrl+Shift+P → "Reload Window")

**Xong cấu hình!** Từ giờ chỉ cần server đang chạy là mọi cửa sổ Antigravity tự kết nối.

---

## ✅ Kiểm tra Server

Sau khi cấu hình xong, hãy kiểm tra kết nối bằng 1 trong 3 cách:

### Cách 1: Nhìn Terminal

Terminal gõ `npm run serve` — nếu vẫn hiện `🚀 Server is running on port 3847` → **Server đang chạy ✅**

### Cách 2: Health Check script

Mở **một Terminal mới** và gõ:

```bash
node reference/tools/health-check.mjs
```

Kết quả ghi vào `exchange/.tmp/health.md`:

- ✅ Running → Server chạy tốt
- ❌ Failed → Server chưa bật hoặc bị lỗi

### Cách 3: Hỏi AI trong Antigravity

Mở chat Antigravity và nhắn:

> "Gọi `hello_world` với name 'test' cho tôi xem"

Nếu AI trả lời `"Hello, test! MCP Orchestrator is running."` → **Kết nối thành công ✅**

Hoặc hỏi chi tiết hơn:

> "Gọi `get_status` cho tôi xem thông tin server"

---

## 🖥️ Hướng dẫn Multi-Session (2+ cửa sổ Antigravity)

### Khái niệm cốt lõi

| Khái niệm | Giải thích |
|-----------|------------|
| **Session** | Một "phiên làm việc" = một cửa sổ IDE Antigravity với chat AI riêng |
| **Agent** | AI assistant trong mỗi session. Mỗi cửa sổ = 1 Agent riêng biệt |
| **Worker** | Agent đăng ký với server, nhận `worker_id` duy nhất |
| **Planner** | Vai trò đặc biệt: phân tích plan → chia thành task |
| **Role** | Vai trò hiện tại của 1 Agent (`PLANNER`, `WORKER`, hoặc `IDLE`) |

> [!NOTE]
> Các cửa sổ Antigravity **KHÔNG chia sẻ bộ nhớ chat** với nhau. Agent A không biết Agent B đang nói gì. **Orchestrator Server** đóng vai trò **người trung gian**, nhớ mọi thứ và phân phối công việc cho tất cả. Đây là lý do server PHẢI chạy liên tục.

### Bố trí được khuyến nghị: 2 cửa sổ Antigravity

```
┌─────────────────────────────────────────────────────────────────┐
│                    MÁY TÍNH CỦA BẠN                             │
│                                                                 │
│  ┌────────────────────────┐    ┌────────────────────────┐      │
│  │  Cửa sổ Antigravity 1  │    │  Cửa sổ Antigravity 2  │      │
│  │  ──────────────────────│    │  ──────────────────────│      │
│  │  Agent A               │    │  Agent B               │      │
│  │                        │    │                        │      │
│  │  Vai trò ban đầu:     │    │  Vai trò ban đầu:     │      │
│  │  Server tự quyết định  │    │  Server tự quyết định  │      │
│  │                        │    │                        │      │
│  │  Có thể là:           │    │  Có thể là:           │      │
│  │  • PLANNER (nếu có    │    │  • WORKER (nếu có     │      │
│  │    plan pending)       │    │    task trong queue)   │      │
│  │  • WORKER              │    │  • IDLE (chờ task)     │      │
│  │  • IDLE                │    │                        │      │
│  └───────────┬────────────┘    └──────────┬─────────────┘      │
│              │  MCP                       │  MCP                │
│              ▼                            ▼                     │
│  ┌──────────────────────────────────────────────────────┐      │
│  │     ORCHESTRATOR SERVER (Terminal riêng, chạy nền)    │      │
│  │     $ npm run serve → port 3847                      │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐      │
│  │     TERMINAL (server)                                 │      │
│  │     $ npm run serve                                   │      │
│  │     🚀 Server is running on port 3847                 │      │
│  │     (ĐỂ YÊN! ĐỪNG TẮT!)                             │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

### 📋 Hướng dẫn từng bước: Setup 2 cửa sổ Antigravity

#### Bước 0: Đảm bảo Server đang chạy

Mở **Terminal** (bất kỳ) rồi gõ:

```bash
cd agent-orchestrator
npm run serve
```

Chờ đến khi thấy `🚀 Server is running on port 3847`. **Đừng tắt terminal này.**

> [!TIP]
> Nếu bạn dùng Antigravity để mở Terminal luôn: Mở folder `agent-orchestrator` → mở Terminal tích hợp → gõ `npm run serve`. Terminal này nằm ở cửa sổ 1. Server sẽ chạy nền trong đó.

---

#### Bước 1: Mở cửa sổ Antigravity thứ 1

1. Mở Antigravity IDE
2. **File → Open Folder** → chọn thư mục `agent-orchestrator`
3. Mở **AI Chat** (sidebar phải hoặc Ctrl+Shift+I)
4. **Copy toàn bộ nội dung file `prompts/agent-prompt.md`** và paste vào chat

Hoặc nếu bạn muốn nhanh hơn, gõ trực tiếp:

```
Bạn hãy đọc file prompts/agent-prompt.md trong project này và làm theo hướng dẫn trong đó.
Bắt đầu bằng việc gọi register_worker().
```

**Agent A sẽ:**
- Gọi `register_worker()` → nhận `worker_id` + `role` ban đầu
- **Nếu có plan trong `plan/pending/`** → Server giao vai trò `PLANNER` → Agent tự decompose plan
- **Nếu có task trong queue** → Server giao vai trò `WORKER` → Agent tự bốc task và làm
- **Nếu không có gì** → `IDLE` → Agent chờ (long-poll)

---

#### Bước 2: Mở cửa sổ Antigravity thứ 2

1. Nhấn **Ctrl+Shift+N** (hoặc File → New Window) → mở cửa sổ Antigravity **MỚI**
2. **File → Open Folder** → chọn lại thư mục `agent-orchestrator` (CÙng thư mục!)
3. Mở **AI Chat** trong cửa sổ mới
4. Paste y hệt prompt ở bước 1:

```
Bạn hãy đọc file prompts/agent-prompt.md trong project này và làm theo hướng dẫn trong đó.
Bắt đầu bằng việc gọi register_worker().
```

**Agent B sẽ:**
- Gọi `register_worker()` → nhận **worker_id KHÁC** Agent A
- Server phát hiện đã có Planner → giao vai trò `WORKER` hoặc `IDLE`
- Khi Planner decompose xong → task vào queue → Agent B tự bốc task và làm

> [!IMPORTANT]
> **Mỗi cửa sổ phải gọi `register_worker()` riêng.** Server phân biệt Agent bằng `worker_id`, không phải bằng cửa sổ. 2 cửa sổ = 2 worker_id = 2 Agent độc lập.

---

#### Bước 3: Giao việc cho hệ thống

Sau khi cả 2 cửa sổ đã `register_worker()` xong:

1. Tạo file `.md` mô tả yêu cầu của bạn
2. Bỏ vào `plan/pending/`
3. **Xong. Không cần làm gì thêm.**

Planner sẽ tự phát hiện → decompose → Workers tự bốc task và làm.

*(Xem chi tiết [Cách giao Task cho hệ thống](#-cách-giao-task-cho-hệ-thống))*

---

### 🔄 Dynamic Role Switching — Cách Server tự phân vai

Bạn **KHÔNG CẦN** chỉ định ai là Planner, ai là Worker. **Server tự quyết định:**

```
Agent A gọi register_worker()
  → Server: "Có plan pending, chưa ai là Planner"
  → Response: role = "PLANNER"
  → Agent A vào loop: check_plans() → decompose → submit_decomposition()

Agent B gọi register_worker()
  → Server: "Đã có Planner, có task trong queue"
  → Response: role = "WORKER"
  → Agent B vào loop: get_next_task() → execute → complete_task()

Khi Planner decompose xong tất cả plan:
  → Server tự chuyển Agent A: role PLANNER → WORKER
  → Agent A bắt đầu bốc task giống Agent B
  → 2 Agent làm song song!
```

Các lệnh chuyển vai trò (từ Server → Agent):

| Action từ Server | Ý nghĩa | Agent phản ứng |
|-----------------|---------|----------------|
| `EXECUTE` | Có task → làm đi | Agent execute task |
| `IDLE` | Không có gì → chờ | Agent long-poll tiếp |
| `BECOME_PLANNER` | Có plan mới → chuyển thành Planner | Agent chuyển sang decompose |
| `DECOMPOSE` | Plan sẵn sàng → phân tích | Agent đọc plan rồi submit |
| `WAIT` | Plan đang bận → chờ | Agent chờ rồi thử lại |

---

### (Tùy chọn) Mở cửa sổ thứ 3 — Thêm Worker

Muốn nhanh hơn? Mở thêm cửa sổ:

1. **Ctrl+Shift+N** → New Window
2. Open Folder `agent-orchestrator`
3. Paste prompt → `register_worker()`

3 Agent sẽ **song song** lấy task khác nhau và làm đồng thời. Không bị xung đột vì mỗi Agent có `worker_id` riêng và server đảm bảo mỗi task chỉ giao cho đúng 1 Worker.

> [!TIP]
> Số lượng cửa sổ tùy bạn (2, 3, 5...). Nhưng **2 cửa sổ là đủ** cho hầu hết trường hợp. Quá nhiều cửa sổ có thể gây chậm máy do mỗi Agent dùng AI model riêng.

---

### Dùng 1 cửa sổ duy nhất?

**Vẫn được!** Bạn đóng **cả 2 vai** (Planner + Worker) trong 1 chat:

1. Gọi `register_worker()` để đăng ký
2. Agent tự nhận vai trò phù hợp
3. Khi xong Planner → tự chuyển sang Worker
4. Một mình bốc task đến hết

> [!TIP]
> Dùng 1 cửa sổ đơn giản hơn nhưng **chậm hơn** vì task chạy **tuần tự**. Dùng 2-3 cửa sổ thì Workers chạy **song song**, nhanh hơn đáng kể khi plan có nhiều task độc lập.

---

## 📝 Cách giao Task cho hệ thống

### Chỉ cần 1 việc: Bỏ file `.md` vào `plan/pending/`

Không cần nhắn AI, không cần gõ lệnh. **Bỏ file vào đúng thư mục là xong.**

### Bước 1: Tạo file plan

Tạo file Markdown trong `plan/pending/`:

```markdown
# Tính năng đăng nhập

## Yêu cầu

- Tạo trang login với form email/password
- Validate input
- Kết nối API backend

## Chi tiết

- File frontend: src/pages/Login.vue
- File API: src/api/auth.mjs
- Cần viết unit test
```

> [!TIP]
> **Đặt tên file có timestamp** để đảm bảo thứ tự FIFO:
> - `2026-04-05_feature-login.md`
> - `2026-04-06_fix-bug-cart.md`
>
> File được sort theo tên — file nào "nhỏ" hơn (cũ hơn) sẽ được xử lý trước.

### Bước 2: Không có bước 2

Planner đang poll `check_plans()` sẽ **tự phát hiện**, đọc file, phân tích, và decompose. Workers sẽ **tự bốc task** và làm.

### Flow bên trong

```
plan/pending/xxx.md
       │
       ▼ Server phát hiện (mỗi 30s)
plan/processing/xxx.md
       │
       ▼ Planner đọc nội dung → phân tích → submit_decomposition()
plan/done/xxx.md    +    Tasks vào exchange/inbox/
                              │
                              ▼ Workers bốc task
                         exchange/active/task-XX.json
                              │
                              ▼ Worker hoàn thành
                         exchange/outbox/result-XX.json
```

> [!IMPORTANT]
> **Tại 1 thời điểm chỉ có 1 plan đang processing.** Nếu bạn bỏ 3 file vào `pending/`, chúng sẽ được xử lý **lần lượt** (FIFO). Tuy nhiên, **các task** trong 1 plan có thể chạy **song song** nếu không có dependency.

### Vòng đời của 1 file plan

```
plan/pending/xxx.md    ──►  plan/processing/xxx.md    ──►  plan/done/xxx.md
(bạn bỏ vào đây)           (đang được decompose)          (đã xong, lưu trữ)
```

- `pending/`: FIFO — file cũ nhất xử lý trước
- `processing/`: Tối đa **1 file** tại 1 thời điểm
- `done/`: Khu lưu trữ — xong rồi không xử lý lại

### Vòng đời của 1 task

```
exchange/inbox/task-XX.json    ──►  exchange/active/task-XX.json    ──►  exchange/outbox/result-XX.json
(trong queue, chờ Worker)           (Worker đang làm)                   (đã hoàn thành, có kết quả)
```

> [!TIP]
> Sau khi cả 2 cửa sổ đã `register_worker()` xong, **việc duy nhất bạn cần làm** mỗi lần là bỏ file `.md` vào `plan/pending/`. Rồi đi uống cà phê ☕.

---

## 🛠️ MCP Tools Reference

Đây là tất cả tool mà server expose qua MCP. Agent gọi qua chat AI.

### Tools cho tất cả Agent

| Tool | Chức năng | Tham số |
|------|----------|---------|
| `hello_world` | Test kết nối server | `name` (string) |
| `register_worker` | Đăng ký Agent, nhận `worker_id` + `role` | *(không có)* |
| `get_status` | Xem thông tin server (version, uptime, workers) | *(không có)* |
| `get_queue_status` | Xem tổng quan queue (pending/active/done count) | *(không có)* |
| `get_checkpoint` | Lưu checkpoint trạng thái hiện tại | *(không có)* |

### Tools cho Worker

| Tool | Chức năng | Tham số |
|------|----------|---------|
| `get_next_task` | Long-poll lấy task tiếp theo (chờ tối đa 30s) | `worker_id` |
| `complete_task` | Báo hoàn thành task | `task_id`, `status` (done/failed/blocked), `summary`, `worker_id`, `auto_pickup` (optional, default: true) |
| `report_progress` | Báo tiến độ task đang làm | `task_id`, `step`, `percentage` (0-100), `worker_id` |

### Tools cho Planner

| Tool | Chức năng | Tham số |
|------|----------|---------|
| `check_plans` | Long-poll quét `plan/pending/` (chờ tối đa 60s) | *(không có)* |
| `submit_decomposition` | Nộp danh sách task + DAG graph | `tasks[]`, `graph`, `reasoning`, `source_plan`, `worker_id` |

### Tools quản trị

| Tool | Chức năng | Tham số |
|------|----------|---------|
| `request_retry` | Yêu cầu requeue task bị lỗi (tối đa 3 lần) | `task_id`, `reason`, `attempt` |
| `force_release_task` | Giải phóng task bị kẹt trong active/ | `task_id`, `reason` |

### Task format khi submit

Mỗi task trong `submit_decomposition` phải theo format:

```json
{
  "id": "01-create-login",     // XX-kebab-case (bắt buộc)
  "module": "src/pages",       // Module/folder liên quan
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

- Task trong **cùng group** chạy **song song**
- Group phải **hoàn thành** trước khi group phụ thuộc bắt đầu
- **Tối đa 20 task** mỗi lần submit

---

## 📋 Prompt Template cho Agent

File `prompts/agent-prompt.md` chứa prompt chuẩn cho Agent. Khi paste vào chat AI, Agent sẽ:

1. **Tự đăng ký** (`register_worker`)
2. **Tự nhận vai trò** (Planner / Worker / Idle)
3. **Tự loop** — liên tục bốc task hoặc quét plan
4. **Tự chuyển vai** khi server ra lệnh

**Cách dùng:**
1. Mở file `prompts/agent-prompt.md`
2. Copy toàn bộ nội dung
3. Paste vào chat AI trong Antigravity
4. Agent sẽ tự chạy

Hoặc nhanh hơn: nhắn AI *"Đọc file `prompts/agent-prompt.md` và làm theo"*.

---

## 📊 Xem kết quả ở đâu?

### 📂 Outbox — Chi tiết từng task đã xong

Mỗi task hoàn thành được ghi vào:

```
exchange/outbox/result-<task-id>.json
```

```json
{
  "task_id": "01-create-login",
  "status": "done",
  "summary": "Tạo xong trang Login.vue với form email/password, validation bằng Zod",
  "worker_id": "w-2458e9ef",
  "completed_at": "2026-04-05T17:00:42.201Z"
}
```

### 📋 Logs — Nhật ký theo ngày

```
exchange/logs/2026-04-05.md
```

Ghi lại từng sự kiện theo thứ tự thời gian:
- `TASK_ASSIGNED` — Task được giao cho worker
- `PROGRESS` — Worker báo tiến độ
- `TASK_COMPLETED` — Task hoàn thành
- `CHECKPOINT_SAVED` — State được snapshot
- `PLAN_COMPLETED` — Plan đã decompose xong

### 🔎 Hỏi AI trực tiếp

Tại bất kỳ cửa sổ nào:

> "Gọi `get_queue_status()` cho tôi xem hiện tại có bao nhiêu task pending, done, failed?"

### Queue Status script

```bash
node reference/tools/queue-status.mjs
```

Kết quả ghi vào `exchange/.tmp/queue-status.md`.

---

## 🔧 Xử lý lỗi

### ❌ `EADDRINUSE: address already in use`

**Nguyên nhân:** Cổng 3847 đang bị chương trình khác chiếm (hoặc server trước chưa tắt hẳn).

**Cách A: Đổi cổng khi khởi động**

```bash
node src/index.mjs serve --port 4000
```

> Nhớ cập nhật `mcp_config.json` → sửa `3847` thành `4000` → restart Antigravity.

**Cách B: Tắt process đang chiếm cổng**

```bash
# Linux / macOS
lsof -i :3847
kill -9 <PID>

# Windows (PowerShell)
netstat -ano | findstr :3847
taskkill /PID <PID> /F
```

---

### ❌ Antigravity không thấy tool nào

**Checklist (kiểm tra theo thứ tự):**

1. ✅ **Server có đang chạy không?** → Terminal phải hiện `🚀 Server is running`
2. ✅ **File cấu hình đúng path chưa?** → Kiểm tra đường dẫn `mcp_config.json`
3. ✅ **URL đúng chưa?** → Phải là `http://127.0.0.1:3847/mcp` (có `/mcp` ở cuối!)
4. ✅ **JSON hợp lệ không?** → Không thiếu dấu phẩy, ngoặc nhọn
5. ✅ **Đã restart Antigravity chưa?** → Phải **tắt hoàn toàn tất cả cửa sổ** rồi mở lại

---

### ❌ Agent gọi tool bị treo (pending)

1. Mở log tại `exchange/logs/YYYY-MM-DD.md` → đọc sự kiện cuối
2. Tắt server bằng **Ctrl+C** rồi bật lại: `npm run serve`
3. Module Recovery tự động dọn dẹp task bị kẹt khi khởi động lại

---

### ❌ Agent gọi `register_worker()` nhưng bị lỗi "connection refused"

- Server chưa chạy. Hãy chạy `npm run serve` trước.
- Cổng bị firewall chặn. Thử đổi sang port khác.

---

### ❌ Mất dữ liệu task giữa chừng

**Đừng lo!** Checkpoint tự động lưu tại:

```
exchange/checkpoints/checkpoint-<timestamp>.json
```

Mở file JSON mới nhất → thấy toàn bộ trạng thái task tại thời điểm đó.

---

### ❌ Task bị kẹt trong `exchange/active/` (worker crash)

Nhắn AI tại bất kỳ cửa sổ nào:

> "Gọi `force_release_task` với `task_id: '01-create-login'`, `reason: 'Worker crashed'`"

Task sẽ được chuyển lại `inbox/` → Worker khác tự bốc.

---

## 🔁 Retry task bị lỗi

### Cách 1: Nhắn AI gọi tool retry

> "Task `03-write-tests` bị lỗi. Tôi đã fix xong. Hãy gọi `request_retry` với `task_id: '03-write-tests'`, `reason: 'Đã fix, thử lại'`, `attempt: 1`."

Server sẽ: lấy task → đẩy lại vào inbox → Worker tự động kéo về làm lại.

### Cách 2: Tự fix rồi retry

1. Sửa code liên quan
2. Nhắn AI: *"Task 03 đã fix xong, gọi `request_retry` để chạy lại"*

> [!WARNING]
> Mỗi task chỉ được retry tối đa **3 lần** (`attempt: 1`, `2`, `3`). Vượt quá 3 → cần review lại plan hoặc tự sửa code.

---

## 🛡️ Recovery tự động

| Tình huống | Hệ thống xử lý |
|------------|----------------|
| Server crash, khởi động lại | Tự quét orphan task trong `exchange/active/` → requeue |
| Worker treo quá 30 phút | Đánh dấu "stale", requeue cho Worker khác |
| Tắt đột ngột (không Ctrl+C) | Phát hiện "unclean shutdown" → full recovery scan |
| Tắt bình thường (Ctrl+C) | Ghi marker "clean shutdown" |

→ **Không cần lo mất dữ liệu.** Mọi thay đổi đều được checkpoint.

---

## 🚀 Quick Start — Tổng hợp

### Setup 1 lần (lần đầu tiên)

```
1. git clone https://github.com/qthan1004/agent-orchestrator.git
2. cd agent-orchestrator
3. npm install
4. Cấu hình mcp_config.json (xem mục "Kết nối Antigravity")
5. Restart tất cả cửa sổ Antigravity
```

### Mỗi lần làm việc

```
1. Mở Terminal → npm run serve               ← Server chạy nền
2. Mở Antigravity cửa sổ 1 → paste prompt    ← Agent A
3. Mở Antigravity cửa sổ 2 → paste prompt    ← Agent B
4. Bỏ file .md vào plan/pending/             ← GIAO VIỆC
5. Ngồi xem (hoặc đi uống cà phê ☕)         ← Agent tự làm
```

### Sơ đồ flow toàn bộ

```
Bạn viết plan.md → plan/pending/         CHỈ CẦN LÀM VIỆC NÀY
                        │
                        ▼
          ┌─────────────────────────────────────────┐
          │  Server phát hiện plan mới               │
          │  → Giao cho Agent (vai Planner)           │
          └────────────────┬────────────────────────┘
                           │
                           ▼
          ┌─────────────────────────────────────────┐
          │  Planner decompose                       │
          │  check_plans() → đọc plan                │
          │  → phân tích → submit_decomposition()    │
          │  → plan chuyển sang plan/done/            │
          │  → Tasks vào exchange/inbox/              │
          └────────────────┬────────────────────────┘
                           │
                           ▼
          ┌─────────────────────────────────────────┐
          │  Workers (1 hoặc nhiều cửa sổ)          │
          │  get_next_task() → nhận task             │
          │  → thực thi code                         │
          │  → complete_task(auto_pickup: true)       │
          │  → tự bốc task kế tiếp                   │
          │  → lặp lại cho đến hết                   │
          └────────────────┬────────────────────────┘
                           │
                           ▼
              Kết quả: exchange/outbox/result-*.json
              Logs:    exchange/logs/YYYY-MM-DD.md
```

### 💡 Mẹo cho người mới

> [!TIP]
>
> - **Ban đầu**, hãy thử với plan đơn giản (2-3 task nhỏ) để làm quen
> - **Luôn kiểm tra** trạng thái bằng `get_queue_status()` trước khi giao task mới
> - **Đọc log** tại `exchange/logs/` nếu muốn hiểu chuyện gì đang xảy ra
> - **Checkpoint** được auto-save, bạn không cần làm gì cả
> - Nếu mọi thứ "im lặng" → thử gọi `get_status()` kiểm tra server
> - **2 cửa sổ là đủ** cho hầu hết dự án. Chỉ thêm nếu plan có > 10 task song song

---

## 💻 CLI Reference

### Khởi động server

```bash
# Mặc định (port 3847)
npm run serve

# Chỉ định port khác
node src/index.mjs serve --port 4000
```

### Interactive config prompt

Khi chạy `npm run serve`, server hiện menu config:

```
🚀 MCP Orchestrator Setup
────────────────────────

? Configuration (default/custom) [default]:
```

- `default` → dùng giá trị mặc định, xác nhận 1 lần
- `custom` → tùy chỉnh port, stale threshold, poll timeout, plan watcher interval

---

## 🔧 Utility Scripts

### Orchestrator Tools (ships with product)

Chạy từ **project root**: `node reference/tools/<script>`

| Script | Chức năng | Output |
|--------|----------|--------|
| `health-check.mjs` | Check MCP server status | `exchange/.tmp/health.md` |
| `queue-status.mjs` | Đếm tasks trong inbox/active/outbox | `exchange/.tmp/queue-status.md` |
| `init-exchange.mjs` | Tạo cấu trúc exchange/ directory | *(console)* |
| `task-scanner.mjs` | Liệt kê chi tiết metadata các task file | `exchange/.tmp/task-scan.md` |
| `reset-exchange.mjs` | Xoá toàn bộ data trong exchange/ (giữ cấu trúc) | *(console)* |

---

## 📦 Tech Stack

| Thành phần | Công nghệ |
|-----------|----------|
| Runtime | Node.js ≥ 18 (ESM) |
| Protocol | MCP (Model Context Protocol) — Streamable HTTP |
| Framework | Express 5 |
| Validation | Zod 4 |
| MCP SDK | `@modelcontextprotocol/sdk` |
| Transport | `mcp-remote` (bridge npx → HTTP) |

---

## 📄 License

MIT
