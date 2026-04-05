# 🤖 Agent Orchestrator

> Standalone AI Agent Orchestrator — Auto-Tasking engine with DAG-based dependency management, multi-session coordination, and file-based state machine.

[![Node.js](https://img.shields.io/badge/Node.js-≥18-green)]()
[![MCP](https://img.shields.io/badge/Protocol-MCP-blue)]()
[![Status](https://img.shields.io/badge/Status-Beta-orange)]()

---

## ✨ Tính năng chính

- **🔄 Auto-Tasking Engine** — Tự động phân tách plan thành task, sắp xếp phụ thuộc (DAG), phân phối cho AI Workers
- **📡 MCP Server** — Giao tiếp real-time với AI Agent qua Model Context Protocol (Streamable HTTP)
- **🧠 Multi-Session** — Nhiều AI Agent chạy song song (Planner + Workers) trên cùng 1 máy
- **📁 File-based State Machine** — Plan flow: `pending/` → `processing/` → `done/`
- **💾 Checkpoint & Recovery** — Auto-save trạng thái, tự phục hồi khi crash
- **📊 Task Board** — Dashboard tổng hợp tiến độ real-time

---

## 🏗️ Kiến trúc tổng quan

```
┌──────────┐      ┌───────────────────┐      ┌──────────┐
│  Bạn     │ ───► │  ORCHESTRATOR     │ ───► │  AI      │
│ (Ông chủ)│      │  (Quản lý)        │      │  (Thợ)   │
│          │ ◄─── │  Server chạy nền  │ ◄─── │          │
│          │      │  trên máy bạn     │      │          │
└──────────┘      └───────────────────┘      └──────────┘
```

- **Bạn** viết ra yêu cầu (plan) → bỏ vào thư mục `plan/pending/`
- **Orchestrator** chia nhỏ thành từng task, sắp xếp thứ tự → giao cho AI thợ
- **AI thợ** làm xong → báo cáo lại → bạn xem kết quả

Server chạy như một **web server cục bộ** trên máy bạn (localhost), và AI (Antigravity) nói chuyện với server này qua giao thức MCP.

---

## 📂 Cấu trúc thư mục

```
agent-orchestrator/
├── plan/                 ← 📝 Kế hoạch của bạn
│   ├── pending/          ← ⬜ Bỏ file .md mới vào đây
│   ├── processing/       ← 🔄 Đang được Planner decompose (tối đa 1)
│   └── done/             ← ✅ Plan đã xong
├── exchange/
│   ├── inbox/            ← 📥 Task mới vào đây trước
│   ├── active/           ← 🔄 Task đang được Worker làm
│   ├── outbox/           ← 📤 Task đã xong (kết quả ở đây!)
│   ├── logs/             ← 📋 Nhật ký theo ngày
│   ├── checkpoints/      ← 💾 Bản sao lưu tự động
│   └── _queue.json       ← 🗂️ Cấu trúc DAG (thứ tự task)
├── tasks/
│   ├── pending/          ← ⬜ Task đang chờ
│   ├── processing/       ← 🔄 Task đang xử lý
│   ├── done/             ← ✅ Task đã hoàn tất
│   └── README.md         ← 📊 Bảng tổng hợp (task board)
├── tools/                ← 🔧 Các script tiện ích
│   ├── task-board.mjs    ← Tạo bảng tổng hợp
│   ├── check-deps.mjs    ← Kiểm tra dependency
│   ├── health-check.mjs  ← Kiểm tra server
│   └── ...
└── src/                  ← ⚙️ Mã nguồn server (không cần sửa)
```

---

## 🚀 Cài đặt và Khởi động

### Yêu cầu hệ thống

```bash
node -v    # Cần v18.x.x trở lên — tải tại https://nodejs.org
git --version  # Tải tại https://git-scm.com nếu chưa có
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

> Lệnh này sẽ tải về tất cả phần mềm phụ trợ (express, zod, MCP SDK...). Chờ 1-2 phút.

### Bước 3: Khởi động Server

```bash
npm run serve
```

Nếu thành công, bạn sẽ thấy:

```
🚀 Server is running on port 3847
```

> [!IMPORTANT]
> **Đừng tắt cửa sổ Terminal này!** Server phải chạy liên tục trong lúc bạn làm việc. Hãy để nó chạy ở background. Mở thêm Terminal mới nếu cần gõ lệnh khác.

### Bước 4: Kết nối Antigravity với Server

Mở file cấu hình MCP của Antigravity tại:

```
C:\Users\<TenBan>\.gemini\antigravity\mcp_config.json
```

> Thay `<TenBan>` bằng tên user Windows của bạn (ví dụ: `Quoc Thanh`)

Thêm nội dung này vào file (nếu file chưa có thì tạo mới):

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

> Nếu file đã có nội dung `mcpServers` rồi, chỉ cần thêm phần `"orchestrator": {...}` vào bên trong.

### Bước 5: Restart Antigravity

- Đóng Antigravity hoàn toàn rồi mở lại
- Hoặc dùng tính năng Reload Extension/Window

**Xong!** Bạn đã cài đặt xong.

---

## ✅ Kiểm tra Server

### Cách 1: Nhìn Terminal

Cửa sổ Terminal gõ `npm run serve` — nếu vẫn hiện `🚀 Server is running on port 3847` → **Server đang chạy ✅**

### Cách 2: Health Check

Mở **một Terminal mới** và gõ:

```bash
node tools/health-check.mjs
```

Kết quả ghi vào `exchange/.tmp/health.md`:
- ✅ Running → Server chạy tốt
- ❌ Failed → Server chưa bật hoặc bị lỗi

### Cách 3: Hỏi AI

Mở chat Antigravity và nhắn:

> "Hãy liệt kê tất cả tool MCP của orchestrator mà bạn thấy"

Nếu AI trả lời thấy các tool như `register_worker`, `get_queue_status`, `complete_task`... → **Kết nối thành công ✅**

---

## 🖥️ Session và Multi-Agent Setup

### Session là gì?

**Session** = một "phiên làm việc" = một cửa sổ chat giữa bạn và AI.

Mỗi cửa sổ IDE mới là **một session riêng biệt** — các session **không chia sẻ bộ nhớ** với nhau. Orchestrator server đóng vai trò **người trung gian**, nhớ mọi thứ và phân phối công việc.

### Bố trí cửa sổ (Khuyến nghị: 2-3 cửa sổ)

```
┌─────────────────────────────────────────────────────────┐
│                   MÁY TÍNH CỦA BẠN                     │
│                                                         │
│  ┌──────────────────┐  ┌──────────────────┐            │
│  │  Cửa sổ 1        │  │  Cửa sổ 2        │            │
│  │  (PLANNER)        │  │  (WORKER 1)      │            │
│  │                   │  │                   │            │
│  │  • Nhận plan      │  │  • get_next_task  │            │
│  │  • Decompose task │  │  • Làm code       │            │
│  │  • Giám sát       │  │  • complete_task  │            │
│  └────────┬──────────┘  └────────┬──────────┘            │
│           │                      │                       │
│           ▼                      ▼                       │
│  ┌──────────────────────────────────────────┐            │
│  │     ORCHESTRATOR SERVER (Terminal nền)    │            │
│  │     npm run serve → port 3847            │            │
│  └──────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────┘
```

### Setup 2 cửa sổ: Planner + Worker

#### 🖥️ Cửa sổ 1 — PLANNER (Bộ não ra lệnh)

1. Mở Antigravity, mở thư mục `agent-orchestrator`
2. Mở Terminal, gõ `npm run serve` → để server chạy nền
3. Mở chat AI, nhắn:

> "Bạn là Planner. Gọi `register_worker()` để đăng ký. Nhiệm vụ duy nhất của bạn: lặp liên tục gọi `check_plans()`. Khi status = 'ready', đọc file plan tại plan_path, phân tích nội dung, rồi gọi `submit_decomposition()` với source_plan. Khi status = 'idle', chờ 10 giây rồi gọi lại."

→ Cửa sổ này **tự động quét plan/** và decompose khi có file mới.

#### 🖥️ Cửa sổ 2 — WORKER (Thợ thi hành)

1. Nhấn `Ctrl + Shift + N` → mở cửa sổ Antigravity mới
2. Mở lại thư mục `agent-orchestrator` trong cửa sổ mới
3. Mở chat AI, nhắn:

> "Bạn là Worker. Gọi `register_worker()` để đăng ký. Hãy lặp liên tục: gọi `get_next_task()` → đọc mô tả → thực thi code → gọi `complete_task()`. Lặp lại cho đến khi hết task trong queue."

→ Cửa sổ này **tự động bốc task và làm**.

#### 🖥️ (Tùy chọn) Cửa sổ 3 — Thêm Worker

Muốn nhanh hơn? Mở thêm cửa sổ thứ 3, setup y hệt cửa sổ 2. Hai Worker sẽ **song song lấy task khác nhau** và làm đồng thời.

> [!IMPORTANT]
> **Mỗi cửa sổ phải gọi `register_worker()` riêng.** Server phân biệt Worker bằng `worker_id`, không phải bằng cửa sổ.

### Dùng 1 cửa sổ duy nhất?

**Vẫn được!** Bạn đóng **cả 2 vai** (Planner + Worker) trong cùng 1 chat:

1. Gọi `register_worker()` để đăng ký
2. Nhắn AI đọc plan và `submit_decomposition()` (vai Planner)
3. Sau đó nhắn AI `get_next_task()` → làm → `complete_task()` (vai Worker)
4. Lặp lại bước 3 cho đến hết

> [!TIP]
> Dùng 1 cửa sổ đơn giản hơn nhưng **chậm hơn** vì task chạy tuần tự. Dùng 2-3 cửa sổ thì các Worker chạy **song song**, nhanh hơn nhiều.

---

## 📝 Cách giao Task cho hệ thống

### Chỉ cần 1 việc: Bỏ file `.md` vào `plan/pending/`

Không cần nhắn AI, không cần gõ lệnh. **Bỏ file vào đúng thư mục là xong.**

**Bước 1:** Tạo file Markdown trong thư mục `plan/pending/`:

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
> **Đặt tên file có timestamp** để đảm bảo thứ tự FIFO, ví dụ: `2026-04-05_feature-login.md`. File được sort theo tên, file nào "nhỏ" hơn sẽ được xử lý trước.

**Bước 2:** Không có bước 2. Planner đang loop `check_plans()` sẽ **tự phát hiện**, đọc file, phân tích, và decompose. Workers sẽ **tự bốc task** và làm.

### Flow bên trong

```
plan/pending/xxx.md    Server phát hiện     Planner đọc & phân tích
      │            →   move → processing/ →   submit_decomposition()
      │                                            │
      │                                       move → plan/done/
      │                                            │
      │                                       Tasks vào queue
      │                                            │
      │                                       Workers bốc & làm
```

> [!IMPORTANT]
> **Tại 1 thời điểm chỉ có 1 plan đang processing.** Nếu bạn bỏ 3 file vào `pending/`, chúng sẽ được xử lý **lần lượt** (FIFO).

### Vòng đời của 1 file plan

```
plan/pending/xxx.md    ──► plan/processing/xxx.md    ──► plan/done/xxx.md
(bạn bỏ vào đây)          (đang được decompose)         (đã xong, lưu trữ)
```

- `pending/`: FIFO — file nào cũ nhất xử lý trước
- `processing/`: Tối đa **1 file** tại 1 thời điểm
- `done/`: Khu lưu trữ — xong rồi không quét nữa

> [!TIP]
> Sau khi setup Planner và Workers xong, **việc duy nhất bạn cần làm** mỗi lần là bỏ file `.md` vào `plan/pending/`. Rồi đi uống cà phê ☕.

---

## 🛠️ MCP Tools Reference

| Tool | Chức năng | Ai dùng |
|------|-----------|---------|
| `register_worker` | Đăng ký AI với server | Bắt buộc, gọi 1 lần đầu |
| `check_plans` | Quét `plan/pending/`, lấy plan mới | Planner (loop liên tục) |
| `submit_decomposition` | Chia plan thành task, đánh dấu plan done | Planner |
| `get_next_task` | Lấy task tiếp theo để làm | Worker (loop liên tục) |
| `report_progress` | Báo tiến độ đang làm (%) | Worker |
| `complete_task` | Báo xong task (done/failed/blocked) | Worker |
| `get_queue_status` | Xem tổng quan queue | Ai cũng dùng |
| `get_checkpoint` | Lưu bản snapshot trạng thái | Ai cũng dùng |
| `request_retry` | Yêu cầu làm lại task bị lỗi | Planner/Bạn |

---

## 📊 Xem kết quả ở đâu?

### 📊 Task Board — Nhìn tổng quan

```bash
node tools/task-board.mjs
```

Kết quả ghi vào `tasks/README.md`:

```markdown
# Task Board — 2026-04-05T01:00:00

| Status | Count |
|--------|-------|
| ⬜ Pending | 2 |
| 🔄 Processing | 1 |
| ✅ Done | 5 |
| **Total** | **8** |

Progress: 5/8 (62%)
```

### 📂 Outbox — Chi tiết từng task

Mỗi task hoàn thành được ghi vào:

```
exchange/outbox/result-<task-id>.json
```

```json
{
  "task_id": "01-create-hello",
  "status": "done",
  "summary": "Completed 01-create-hello successfully",
  "worker_id": "w-2458e9ef",
  "completed_at": "2026-04-04T17:00:42.201Z"
}
```

### 📋 Logs — Nhật ký theo ngày

```
exchange/logs/2026-04-05.md
```

Ghi lại từng sự kiện theo thứ tự thời gian: `TASK_ASSIGNED`, `PROGRESS`, `TASK_COMPLETED`, `CHECKPOINT_SAVED`...

### 🔎 Hỏi AI trực tiếp

> "Gọi `get_queue_status()` cho tôi xem hiện tại có bao nhiêu task pending, done, failed?"

---

## 🔧 Xử lý lỗi

### ❌ `EADDRINUSE: address already in use`

**Nguyên nhân:** Cổng 3847 đang bị chương trình khác chiếm.

**Cách A: Đổi cổng**
```bash
node src/index.mjs serve --port 4000
```
> Nhớ cập nhật file `mcp_config.json` sửa `3847` thành `4000`

**Cách B: Tắt process đang chiếm cổng**
```powershell
netstat -ano | findstr :3847
# Lấy PID (số cuối cùng) rồi:
taskkill /PID <PID> /F
```

### ❌ Antigravity không thấy tool nào

**Checklist:**
1. **Server có đang chạy không?** → Terminal phải hiện `🚀 Server is running`
2. **File cấu hình đúng chưa?** → URL phải là `http://127.0.0.1:3847/mcp` (có `/mcp`!)
3. **Đã restart Antigravity chưa?** → Phải tắt hoàn toàn rồi mở lại

### ❌ Client gọi bị treo (pending)

1. Mở log tại `exchange/logs/` → đọc dòng lỗi cuối
2. Tắt server (Ctrl+C) rồi bật lại: `npm run serve`
3. Module Recovery tự động dọn dẹp task bị kẹt khi khởi động lại

### ❌ Mất dữ liệu task giữa chừng

**Đừng lo!** Checkpoint tự động lưu tại:

```
exchange/checkpoints/checkpoint-<timestamp>.json
```

Mở file JSON mới nhất → thấy toàn bộ trạng thái task tại thời điểm đó.

---

## 🔁 Retry task bị lỗi

### Cách 1: Nhắn AI gọi tool retry

> "Task `03-write-tests` bị lỗi. Tôi đã fix xong. Hãy gọi `request_retry` với `task_id: '03-write-tests'`, `reason: 'Đã fix, thử lại'`, `attempt: 1`."

Server sẽ: lấy task thất bại → đẩy lại vào queue → Worker tự động kéo về làm lại.

### Cách 2: Tự fix rồi retry

1. Sửa code liên quan
2. Nhắn AI: *"Task 03 đã fix xong, gọi `request_retry` để chạy lại"*

> [!WARNING]
> Mỗi task chỉ được retry tối đa **3 lần** (`attempt: 1`, `2`, `3`). Vượt quá 3 → cần review lại plan hoặc tự sửa code.

---

## 🛡️ Recovery tự động

| Tình huống | Hệ thống xử lý |
|------------|-----------------|
| Server crash, khởi động lại | Tự quét orphan task trong `exchange/active/` → requeue |
| Worker treo quá 30 giây | Đánh dấu "stale", requeue cho Worker khác |
| Tắt đột ngột (không Ctrl+C) | Phát hiện "unclean shutdown" → full recovery scan |
| Tắt bình thường (Ctrl+C) | Ghi marker "clean shutdown" |

→ **Không cần lo mất dữ liệu.** Mọi thay đổi đều được checkpoint.

---

## 🚀 Quick Start — Tổng hợp

### Setup 1 lần (lần đầu tiên)

```
1. npm install                          ← Cài thư viện
2. npm run serve                        ← Terminal, để chạy nền
3. Mở cửa sổ 1 → paste prompt Planner  ← Ctrl+Shift+N
4. Mở cửa sổ 2 → paste prompt Worker   ← Ctrl+Shift+N
   (Tùy chọn: cửa sổ 3 thêm Worker)
```

### Sử dụng hàng ngày (chỉ cần 1 bước)

```
Bỏ file .md vào plan/pending/         ← CHỈ CẦN LÀM VIỆC NÀY
                │
                ▼
   ┌─────────────────────────────────────────┐
   │  Planner (loop)                         │
   │  check_plans() → "ready!"               │
   │  → đọc file → phân tích                 │
   │  → submit_decomposition()               │
   │  → plan move sang done/                 │
   └────────────────┬────────────────────────┘
                    │ tasks vào queue
                    ▼
   ┌─────────────────────────────────────────┐
   │  Workers (loop)                         │
   │  get_next_task() → nhận task            │
   │  → thực thi code                        │
   │  → complete_task()                      │
   │  → lặp lại                              │
   └─────────────────────────────────────────┘
                    │
                    ▼
          Kết quả ở exchange/outbox/
          Task board: node tools/task-board.mjs
```

### 💡 Mẹo cho người mới

> [!TIP]
> - **Ban đầu**, hãy thử với plan đơn giản (2-3 task nhỏ) để làm quen
> - **Luôn kiểm tra** `get_queue_status()` trước khi giao task mới
> - **Đọc log** tại `exchange/logs/` nếu muốn hiểu chuyện gì đang xảy ra
> - **Checkpoint** được auto-save, bạn không cần làm gì cả
> - Nếu mọi thứ "im lặng", gõ `node tools/check-deps.mjs` để xem task nào đang bị block

---

## 📦 Tech Stack

| Thành phần | Công nghệ |
|------------|-----------|
| Runtime | Node.js ≥ 18 (ESM) |
| Protocol | MCP (Model Context Protocol) — Streamable HTTP |
| Framework | Express 5 |
| Validation | Zod 4 |
| MCP SDK | `@modelcontextprotocol/sdk` |

---

## 📄 License

MIT
