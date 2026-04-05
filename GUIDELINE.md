# 📘 Hướng Dẫn Sử Dụng Agent Orchestrator — Từ A đến Z

> Tài liệu này viết cho người **chưa biết gì** về hệ thống. Đọc xong là dùng được.

---

## Mục Lục

1. [Agent Orchestrator là cái gì?](#1-agent-orchestrator-là-cái-gì)
2. [Cài đặt và Khởi động](#2-cài-đặt-và-khởi-động)
3. [Kiểm tra Server có chạy không](#3-kiểm-tra-server-có-chạy-không)
4. [Khắc phục lỗi thường gặp](#4-khắc-phục-lỗi-thường-gặp)
5. [Session là gì? Mở nhiều cửa sổ như thế nào?](#5-session-là-gì-mở-nhiều-cửa-sổ-như-thế-nào)
6. [Cách giao Task cho hệ thống](#6-cách-giao-task-cho-hệ-thống)
7. [File plan bỏ vào thì chạy như thế nào?](#7-file-plan-bỏ-vào-thì-chạy-như-thế-nào)
8. [Kết quả report ở đâu?](#8-kết-quả-report-ở-đâu)
9. [Khi lỗi thì xem ở đâu và xử lý thế nào?](#9-khi-lỗi-thì-xem-ở-đâu-và-xử-lý-thế-nào)
10. [Tổng hợp — Quy trình làm việc từ đầu đến cuối](#10-tổng-hợp--quy-trình-làm-việc-từ-đầu-đến-cuối)

---

## 1. Agent Orchestrator là cái gì?

Hãy tưởng tượng bạn là **ông chủ** của một đội thợ (AI Agent). Bạn muốn giao một "dự án lớn" cho đội thợ, nhưng bạn không muốn ngồi cầm tay chỉ việc từng bước.

**Agent Orchestrator** chính là **người quản lý công trình** đứng giữa:

```
┌──────────┐      ┌───────────────────┐      ┌──────────┐
│  Bạn     │ ───► │  ORCHESTRATOR     │ ───► │  AI      │
│ (Ông chủ)│      │  (Quản lý)        │      │  (Thợ)   │
│          │ ◄─── │  Server chạy nền  │ ◄─── │          │
│          │      │  trên máy bạn     │      │          │
└──────────┘      └───────────────────┘      └──────────┘
```

- **Bạn** viết ra yêu cầu (plan) → bỏ vào thư mục `plan/`
- **Orchestrator** chia nhỏ thành từng task, sắp xếp thứ tự → giao cho AI thợ
- **AI thợ** làm xong → báo cáo lại → bạn xem kết quả

Nó chạy như một **web server cục bộ** trên máy bạn (localhost), và AI (Antigravity) nói chuyện với server này qua giao thức MCP.

---

## 2. Cài đặt và Khởi động

### Bước 1: Kiểm tra máy có sẵn công cụ chưa

Mở Terminal (PowerShell / CMD) và gõ:

```bash
node -v
# Nếu ra v18.x.x trở lên → OK ✅
# Nếu báo lỗi → Tải Node.js tại https://nodejs.org rồi cài

git --version
# Nếu ra git version x.x.x → OK ✅
# Nếu báo lỗi → Tải Git tại https://git-scm.com
```

### Bước 2: Tải mã nguồn về

```bash
git clone https://github.com/qthan1004/agent-orchestrator.git
cd agent-orchestrator
```

### Bước 3: Cài thư viện

```bash
npm install
```

> Lệnh này sẽ tải về tất cả phần mềm phụ trợ (express, zod, MCP SDK...). Chờ 1-2 phút.

### Bước 4: Khởi động Server

```bash
npm run serve
```

Nếu thành công, bạn sẽ thấy dòng chữ:

```
🚀 Server is running on port 3847
```

> [!IMPORTANT]
> **Đừng tắt cửa sổ Terminal này!** Server phải chạy liên tục trong lúc bạn làm việc. Hãy để nó chạy ở background. Mở thêm Terminal mới nếu cần gõ lệnh khác.

### Bước 5: Kết nối Antigravity với Server

Mở file cấu hình MCP của Antigravity tại:

```
C:\Users\<TenBan>\\.gemini\antigravity\mcp_config.json
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

### Bước 6: Restart Antigravity

- Đóng Antigravity hoàn toàn rồi mở lại
- Hoặc dùng tính năng Reload Extension/Window

**Xong!** Bạn đã cài đặt xong. Tiếp theo là kiểm tra xem nó có hoạt động không.

---

## 3. Kiểm tra Server có chạy không

### Cách 1: Nhìn Terminal

Cửa sổ Terminal mà bạn gõ `npm run serve` lúc nãy — nếu vẫn đang chạy và hiện `🚀 Server is running on port 3847` → **Server đang chạy ✅**

### Cách 2: Dùng công cụ Health Check

Mở **một Terminal mới** (không phải cái đang chạy server) và gõ:

```bash
node tools/health-check.mjs
```

Kết quả sẽ ghi vào file `exchange/.tmp/health.md`. Mở file đó ra xem:

- ✅ Running → Server chạy tốt
- ❌ Failed → Server chưa bật hoặc bị lỗi

### Cách 3: Hỏi AI trong Antigravity

Mở chat Antigravity và nhắn:

> "Hãy liệt kê tất cả tool MCP của orchestrator mà bạn thấy"

Nếu AI trả lời thấy các tool như `register_worker`, `get_queue_status`, `complete_task`... → **Kết nối thành công ✅**

Nếu AI nói không thấy tool gì → Xem phần khắc phục lỗi bên dưới.

---

## 4. Khắc phục lỗi thường gặp

### ❌ Lỗi: `EADDRINUSE: address already in use`

**Nguyên nhân:** Cổng 3847 đang bị chương trình khác chiếm.

**Cách sửa — Chọn 1 trong 2:**

**Cách A: Đổi cổng**
```bash
node src/index.mjs serve --port 4000
```
> Nhớ cập nhật file `mcp_config.json` sửa `3847` thành `4000`

**Cách B: Tìm và tắt chương trình đang chiếm cổng**
```powershell
# Tìm process đang dùng cổng 3847
netstat -ano | findstr :3847

# Kết quả sẽ cho bạn PID (số cuối cùng), ví dụ: 12345
# Tắt process đó:
taskkill /PID 12345 /F
```

---

### ❌ Lỗi: Antigravity không thấy tool nào

**Checklist kiểm tra theo thứ tự:**

1. **Server có đang chạy không?** → Quay lại Terminal, kiểm tra xem có dòng `🚀 Server is running` không
2. **File cấu hình đúng chưa?** → Mở lại `mcp_config.json`, kiểm tra:
   - URL phải là `http://127.0.0.1:3847/mcp` (chú ý có `/mcp` ở cuối!)
   - Cú pháp JSON phải đúng (dấu ngoặc, dấu phẩy...)
3. **Đã restart Antigravity chưa?** → Phải tắt hoàn toàn rồi mở lại

---

### ❌ Lỗi: Client gọi mãi bị treo (pending)

**Nguyên nhân:** Server bị lỗi nội bộ hoặc quá tải.

**Cách xử lý:**
1. Mở file log tại `exchange/logs/` (file có tên ngày hiện tại, ví dụ `2026-04-05.md`)
2. Kéo xuống cuối file → đọc dòng lỗi cuối cùng
3. Tắt server (Ctrl+C ở Terminal) rồi bật lại: `npm run serve`
4. Hệ thống có module Recovery tự động, nó sẽ dọn dẹp các task bị kẹt khi khởi động lại

---

### ❌ Lỗi: Mất dữ liệu task giữa chừng

**Đừng lo!** Hệ thống tự động lưu checkpoint mỗi khi có thay đổi quan trọng. Dữ liệu nằm tại:

```
exchange/checkpoints/checkpoint-<timestamp>.json
```

Mở file JSON mới nhất ra xem → sẽ thấy toàn bộ trạng thái task (pending, done, failed...) tại thời điểm đó.

---

## 5. Session là gì? Mở nhiều cửa sổ như thế nào?

### Session là gì?

**Session** = một "phiên làm việc" = một cửa sổ chat giữa bạn và AI.

Mỗi khi bạn mở một **cửa sổ IDE mới** và bắt đầu chat với AI, đó là **một session riêng biệt**. Các session **không chia sẻ bộ nhớ** với nhau — nghĩa là AI ở cửa sổ 1 không biết AI ở cửa sổ 2 đang nghĩ gì.

Orchestrator server đóng vai trò **người trung gian** — nó nhớ mọi thứ và phân phối công việc cho các session.

### Bạn chỉ cài 1 IDE (Antigravity) — vẫn mở được nhiều cửa sổ!

Giống như bạn cài 1 trình duyệt Chrome nhưng mở được 10 tab — **Antigravity cũng vậy**. Bạn cài 1 lần, nhưng mở bao nhiêu cửa sổ cũng được. Mỗi cửa sổ = 1 session = 1 "con AI riêng".

**Cách mở thêm cửa sổ:**

```
Ctrl + Shift + N   (Windows)
Cmd  + Shift + N   (macOS)

Hoặc: File → New Window
```

> Sau khi mở cửa sổ mới, **mở lại thư mục dự án** (`agent-orchestrator`) trong cửa sổ đó. Rồi mở chat AI — lúc này bạn đã có 1 session hoàn toàn mới.

### Cách bố trí cửa sổ (Khuyến nghị: 2-3 cửa sổ)

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

### Hướng dẫn step-by-step: Setup 2 cửa sổ (1 Planner + 1 Worker)

#### 🖥️ Cửa sổ 1 — Vai trò PLANNER (Bộ não ra lệnh)

1. Mở Antigravity, mở thư mục `agent-orchestrator`
2. Mở Terminal, gõ `npm run serve` → để server chạy nền
3. Mở chat AI, nhắn:

> "Bạn là Planner. Gọi `register_worker()` để đăng ký. Nhiệm vụ duy nhất của bạn: lặp liên tục gọi `check_plans()`. Khi status = 'ready', đọc file plan tại plan_path, phân tích nội dung, rồi gọi `submit_decomposition()` với source_plan. Khi status = 'idle', chờ 10 giây rồi gọi lại."

→ Cửa sổ này **tự động quét plan/** và decompose khi có file mới — bạn không cần nhắn gì thêm.

#### 🖥️ Cửa sổ 2 — Vai trò WORKER (Thợ thi hành)

1. Nhấn `Ctrl + Shift + N` → mở cửa sổ Antigravity mới
2. Mở lại thư mục `agent-orchestrator` trong cửa sổ mới
3. Mở chat AI, nhắn:

> "Bạn là Worker. Gọi `register_worker()` để đăng ký. Hãy lặp liên tục: gọi `get_next_task()` → đọc mô tả → thực thi code → gọi `complete_task()`. Lặp lại cho đến khi hết task trong queue."

→ Cửa sổ này **tự động bốc task và làm**, không cần bạn can thiệp.

#### 🖥️ (Tùy chọn) Cửa sổ 3 — Thêm Worker nữa

Muốn nhanh hơn? Mở thêm cửa sổ thứ 3, setup y hệt cửa sổ 2. Hai Worker sẽ **song song lấy task khác nhau** và làm đồng thời.

> [!IMPORTANT]
> **Mỗi cửa sổ phải gọi `register_worker()` riêng.** Server phân biệt Worker bằng `worker_id`, không phải bằng cửa sổ. Không gọi register = không lấy được task.

### Nếu chỉ muốn dùng 1 cửa sổ duy nhất?

**Vẫn được!** Bạn đóng **cả 2 vai** (Planner + Worker) trong cùng 1 chat:

1. Gọi `register_worker()` để đăng ký
2. Nhắn AI đọc plan và `submit_decomposition()` (vai Planner)
3. Sau đó nhắn AI `get_next_task()` → làm → `complete_task()` (vai Worker)
4. Lặp lại bước 3 cho đến hết

> [!TIP]
> Dùng 1 cửa sổ đơn giản hơn nhưng **chậm hơn** vì task chạy tuần tự. Dùng 2-3 cửa sổ thì các Worker chạy **song song**, nhanh hơn nhiều khi có nhiều task.

---

## 6. Cách giao Task cho hệ thống

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

### Chuyện gì xảy ra bên trong?

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
> **Tại 1 thời điểm chỉ có 1 plan đang processing.** Nếu bạn bỏ 3 file vào `pending/`, chúng sẽ được xử lý **lần lượt** (FIFO). Plan trước xong thì plan sau mới bắt đầu.

---

### Tóm tắt các Tool chính

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

## 7. File plan bỏ vào thì chạy như thế nào?

### Bỏ file vào `plan/pending/` → Tất cả tự chạy

Đây chính là **lý do tool này tồn tại**. Toàn bộ quy trình:

```
Bạn bỏ file .md          Planner tự phát hiện       Workers tự động
vào plan/pending/    →    đọc & decompose        →   bốc task & làm
                          (tự động, k cần nhắn)      (tự động)
```

### Phân công trách nhiệm

| Thành phần | Việc làm | Cơ chế |
|---|---|---|
| **Server (Node)** | Quét `plan/pending/`, move file, quản lý queue | Tool `check_plans` — trả kết quả khi AI hỏi |
| **Planner (AI)** | Đọc plan, phân tích, chia task, đẩy DAG | Loop gọi `check_plans()` → `submit_decomposition()` |
| **Worker (AI)** | Lấy task, code, test, báo cáo | Loop gọi `get_next_task()` → `complete_task()` |

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

## 8. Kết quả report ở đâu?

Có **3 nơi** bạn có thể xem kết quả:

### 📊 Nơi 1: Task Board — Nhìn tổng quan

Gõ lệnh trong Terminal:

```bash
node tools/task-board.mjs
```

Kết quả ghi vào file `tasks/README.md`. Mở file đó ra, bạn sẽ thấy:

```markdown
# Task Board — 2026-04-05T01:00:00

| Status | Count |
|--------|-------|
| ⬜ Pending | 2 |
| 🔄 Processing | 1 |
| ✅ Done | 5 |
| **Total** | **8** |

Progress: 5/8 (62%)

## ✅ Done
- 01-create-login-page.md
- 02-create-auth-api.md
...
```

→ Nhìn 1 cái thấy ngay **bao nhiêu task xong, bao nhiêu đang chờ, bao nhiêu đang chạy**.

---

### 📂 Nơi 2: Outbox — Xem chi tiết từng task

Mỗi khi 1 task hoàn thành (dù thành công hay thất bại), kết quả được ghi vào:

```
exchange/outbox/result-<task-id>.json
```

Ví dụ file `exchange/outbox/result-01-create-hello.json`:

```json
{
  "task_id": "01-create-hello",
  "status": "done",
  "summary": "Completed 01-create-hello successfully",
  "worker_id": "w-2458e9ef",
  "completed_at": "2026-04-04T17:00:42.201Z"
}
```

**Bạn thấy ngay:**
- `status`: "done" hay "failed"?
- `summary`: AI làm gì? Nếu lỗi thì lỗi gì?
- `worker_id`: AI nào (Worker nào) đã làm task này?
- `completed_at`: Hoàn thành lúc nào?

---

### 📋 Nơi 3: Logs — Xem nhật ký từng sự kiện

File log theo ngày tại:

```
exchange/logs/2026-04-05.md
```

Mở ra bạn sẽ thấy từng dòng sự kiện theo thứ tự thời gian:

```markdown
## 00:00:42 — TASK_ASSIGNED
- task_id: 01-create-hello
- worker_id: w-2458e9ef

## 00:00:42 — PROGRESS
- task_id: 01-create-hello
- step: Creating file
- percentage: 50

## 00:00:42 — TASK_COMPLETED
- task_id: 01-create-hello
- status: done
- worker_id: w-2458e9ef

## 00:00:42 — CHECKPOINT_SAVED
- file: checkpoint-2026-04-04T17-00-42-202Z.json
```

→ Đây là "camera an ninh" ghi lại mọi thứ xảy ra trong hệ thống.

---

### 🔎 Bonus: Hỏi AI xem trực tiếp

Bạn cũng có thể nhắn AI trong chat:

> "Gọi `get_queue_status()` cho tôi xem hiện tại có bao nhiêu task pending, done, failed?"

AI sẽ trả về ngay lập tức, ví dụ:

```json
{
  "pending": 2,
  "active": 0,
  "done": 5,
  "failed": 1,
  "workers": 1
}
```

---

## 9. Khi lỗi thì xem ở đâu và xử lý thế nào?

### 🔴 Bước 1: Phát hiện lỗi

Có 3 cách phát hiện task bị lỗi:

| Cách | Làm gì |
|------|--------|
| **Hỏi AI** | Nhắn: *"Gọi `get_queue_status()` xem có task nào failed không?"* |
| **Xem outbox** | Mở các file `exchange/outbox/result-*.json`, tìm file có `"status": "failed"` |
| **Xem task board** | Chạy `node tools/task-board.mjs` rồi mở `tasks/README.md` |

---

### 🔍 Bước 2: Đọc chi tiết lỗi

Mở file result trong outbox tương ứng:

```
exchange/outbox/result-<task-id>.json
```

Ví dụ nếu task `03-write-tests` bị lỗi:

```json
{
  "task_id": "03-write-tests",
  "status": "failed",
  "summary": "Cấu hình thiếu Module vitest — cần npm install vitest",
  "worker_id": "w-abc123",
  "completed_at": "2026-04-05T01:30:00.000Z"
}
```

→ Đọc `summary` sẽ biết **lỗi gì** và **cần sửa gì**.

---

### 🔁 Bước 3: Cho task làm lại (Retry)

**Cách 1: Nhắn AI gọi tool retry**

> "Task `03-write-tests` bị lỗi vì thiếu vitest. Tôi đã cài xong rồi. Hãy gọi `request_retry` với `task_id: '03-write-tests'`, `reason: 'Đã cài vitest, thử lại'`, `attempt: 1`."

Khi gọi `request_retry`, server sẽ:
1. Lấy task thất bại ra khỏi outbox
2. Đẩy lại vào hàng đợi (inbox → pending queue)
3. Worker đang chờ sẽ tự động kéo task này về và làm lại

**Cách 2: Tự fix thủ công rồi nhờ AI chạy lại**

Nếu lỗi là do code sai, bạn có thể:
1. Tự sửa code liên quan
2. Nhắn AI: *"Task 03 đã fix xong, gọi `request_retry` để chạy lại"*

> [!WARNING]
> Mỗi task chỉ được retry tối đa **3 lần** (`attempt: 1`, `2`, `3`). Nếu vượt quá 3 lần, server sẽ từ chối. Lúc đó bạn cần review lại plan hoặc tự sửa code.

---

### 🛡️ Hệ thống tự phục hồi (Recovery tự động)

Ngoài retry thủ công, hệ thống có cơ chế **Recovery tự động**:

| Tình huống | Hệ thống xử lý |
|------------|-----------------|
| Server bị crash, khởi động lại | Tự quét các task bị bỏ rơi (orphan) trong `exchange/active/` và đẩy lại vào queue |
| Worker bị treo quá 30 giây | Server đánh dấu "stale", tự lấy task ra và requeue cho Worker khác |
| Server tắt đột ngột (không Ctrl+C) | Khi bật lại, phát hiện "unclean shutdown" → chạy full recovery scan |
| Server tắt bình thường (Ctrl+C) | Ghi marker "clean shutdown", lần sau bật lên biết mọi thứ OK |

→ Bạn **không cần lo** mất dữ liệu. Mọi thay đổi đều được checkpoint.

---

## 10. Tổng hợp — Quy trình làm việc từ đầu đến cuối

### Setup 1 lần (lần đầu tiên)

```
1. npm run serve                       ← Terminal, để chạy nền
2. Mở cửa sổ 1 → paste prompt Planner ← Ctrl+Shift+N
3. Mở cửa sổ 2 → paste prompt Worker  ← Ctrl+Shift+N
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

### Mẹo cho người mới

> [!TIP]
> - **Ban đầu**, hãy thử với plan đơn giản (2-3 task nhỏ) để làm quen
> - **Luôn kiểm tra** `get_queue_status()` trước khi giao task mới
> - **Đọc log** tại `exchange/logs/` nếu muốn hiểu chuyện gì đang xảy ra bên trong
> - **Checkpoint** được auto-save, bạn không cần làm gì cả
> - Nếu mọi thứ "im lặng", gõ `node tools/check-deps.mjs` để xem task nào đang bị block

---

## Phụ Lục: Cấu trúc thư mục quan trọng

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
