# Agent Orchestrator

Agent Orchestrator là một server chạy trên máy của bạn để điều phối AI làm việc theo kế hoạch. Bạn viết yêu cầu vào file Markdown, bỏ file đó vào thư mục đúng chỗ, server sẽ đọc, chia việc, xếp hàng, cấp phiên chạy cho AI, theo dõi tiến độ, rồi lưu kết quả lại.

Tài liệu này viết cho người không rành kỹ thuật. Cứ đi theo từng bước là dùng được.

## Mục Lục

- [Đây là gì?](#đây-là-gì)
- [Dùng để làm gì?](#dùng-để-làm-gì)
- [Cách hệ thống hoạt động](#cách-hệ-thống-hoạt-động)
- [Chuẩn bị trước khi dùng](#chuẩn-bị-trước-khi-dùng)
- [Cài đặt lần đầu](#cài-đặt-lần-đầu)
- [Chạy hằng ngày](#chạy-hằng-ngày)
- [Giao việc cho AI](#giao-việc-cho-ai)
- [Theo dõi tiến độ](#theo-dõi-tiến-độ)
- [Xem kết quả](#xem-kết-quả)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)
- [Điều không nên làm](#điều-không-nên-làm)
- [Phần kỹ thuật ngắn](#phần-kỹ-thuật-ngắn)

## Đây là gì?

Agent Orchestrator là "người điều phối" cho AI agent.

Thay vì bạn phải ngồi nhắc AI từng bước, hệ thống làm các việc sau:

- Nhận một yêu cầu lớn từ bạn.
- Chia yêu cầu đó thành nhiều task nhỏ.
- Biết task nào phải làm trước, task nào được làm sau.
- Chọn runtime phù hợp để chạy AI.
- Cấp quyền làm đúng task đang được giao.
- Theo dõi AI đã sẵn sàng chưa, đang chạy chưa, đã xong chưa.
- Nhận callback từ harness khi AI báo `complete`, `failed`, hoặc `handover_required`.
- Lưu kết quả vào workspace của bạn.

Trong Phase 2, worker không còn tự bốc task. Server là bên quyết định task nào được chạy, runtime nào được cấp, worker nào đang sở hữu task nào.

## Dùng để làm gì?

Bạn dùng Agent Orchestrator khi muốn AI làm việc theo quy trình rõ ràng hơn:

- Viết feature nhỏ hoặc vừa.
- Sửa bug có nhiều bước.
- Refactor nhiều file.
- Tách một yêu cầu lớn thành danh sách task có thứ tự.
- Cho AI làm từng phần và ghi lại kết quả.
- Tự phục hồi khi task lỗi, task kẹt, hoặc phiên chạy bị mất.

Ví dụ:

- "Thêm màn hình đăng nhập."
- "Sửa lỗi validate form checkout."
- "Tách module thanh toán ra service riêng."
- "Viết tài liệu cho API hiện tại."

Bạn không cần hiểu hết kỹ thuật bên trong. Điều quan trọng là biết cách chạy server, đặt file kế hoạch vào đúng thư mục, và xem kết quả.

## Cách hệ thống hoạt động

Luồng hiện tại của Phase 2:

```text
Bạn viết plan
  -> bỏ vào <workspace>/.orchestrator/plans/pending/
  -> Plan Watcher phát hiện file mới
  -> State Manager chuyển plan sang processing
  -> Planner chia plan thành task
  -> Task Queue xếp task theo thứ tự phụ thuộc
  -> Dispatch Loop chọn task có thể chạy
  -> Runtime Manager tạo runtime lease
  -> Runtime Service mở backend/runtime phù hợp
  -> Harness nhận payload và chạy AI
  -> Harness gửi ready/progress/complete callback về server
  -> Server xác nhận đúng lease rồi lưu kết quả
```

Nói ngắn gọn:

- `server` điều phối mọi thứ.
- `plan watcher` canh thư mục plan mới.
- `task queue` giữ danh sách task và thứ tự chạy.
- `runtime lease` là "vé làm việc" cho một task cụ thể.
- `harness` là lớp bọc chạy AI và báo trạng thái về server.
- `callback` là tín hiệu harness gửi về server.

Một task hợp lệ trong Phase 2 thường đi theo nguyên tắc:

```text
1 active task -> 1 runtime lease -> 1 backend runtime/session -> 1 point reservation
```

Nhờ vậy server biết chính xác ai đang làm việc gì. Callback trễ, callback sai task, hoặc callback không khớp lease sẽ bị từ chối.

## Chuẩn bị trước khi dùng

Bạn cần có:

| Thứ cần có | Dùng để làm gì | Ghi chú |
| --- | --- | --- |
| Node.js | Chạy server | Nên dùng Node.js 18 trở lên |
| Git | Tải source code và quản lý thay đổi | Bản mới nào cũng được |
| Terminal | Gõ lệnh chạy server | Windows dùng PowerShell được |
| Workspace | Project bạn muốn AI làm việc | Ví dụ một repo web/app/API |
| Ollama | Chạy model local | Nên có nếu dùng backend local |
| Codex CLI hoặc Antigravity CLI | Chạy backend cloud/CLI | Tùy cấu hình |

Có hai thư mục cần phân biệt:

- `agent-orchestrator`: thư mục chứa server này.
- `workspace`: project bạn muốn AI chỉnh sửa.

Nếu bạn muốn AI làm việc ngay trên chính repo `agent-orchestrator`, hai thư mục này là một. Nếu bạn muốn AI làm việc trên project khác, khi chạy server hãy chọn `custom` và nhập đường dẫn tuyệt đối tới project đó.

Ví dụ đường dẫn workspace trên Windows:

```text
D:\workspace\my-app
```

Ví dụ đường dẫn workspace trên macOS/Linux:

```text
/Users/you/workspace/my-app
```

## Cài đặt lần đầu

### 1. Tải source code

Mở Terminal tại nơi bạn muốn đặt server, rồi chạy:

```bash
git clone https://github.com/qthan1004/agent-orchestrator.git
cd agent-orchestrator
```

Nếu bạn đã có thư mục này rồi, chỉ cần mở Terminal trong thư mục `agent-orchestrator`.

### 2. Cài thư viện

Chạy:

```bash
npm install
```

Việc này tải các thư viện cần thiết cho server.

### 3. Build server

Chạy:

```bash
npm run build
```

Lệnh này tạo bản chạy được trong thư mục `dist/`.

### 4. Chạy server

Chạy:

```bash
npm run serve
```

Server sẽ hỏi cấu hình:

```text
? Configuration (default/custom) [default]:
```

Chọn theo trường hợp của bạn:

| Bạn muốn làm gì | Chọn gì |
| --- | --- |
| Dùng chính thư mục hiện tại làm workspace | Nhấn Enter để dùng `default` |
| Dùng project khác làm workspace | Gõ `custom`, rồi nhập đường dẫn tuyệt đối tới project đó |

Nếu chọn `default`, server dùng thư mục hiện tại làm workspace. Nếu bạn đang đứng trong `agent-orchestrator`, AI sẽ làm việc trên repo này.

Nếu chọn `custom`, server sẽ hỏi:

```text
Workspace root (REQUIRED - absolute path):
```

Hãy nhập đường dẫn đầy đủ tới project bạn muốn AI làm việc.

Ví dụ:

```text
D:\workspace\my-app
```

Sau khi chạy thành công, server lắng nghe tại:

```text
http://127.0.0.1:3847
```

Endpoint chính:

```text
http://127.0.0.1:3847/mcp
```

Trang kiểm tra sức khỏe:

```text
http://127.0.0.1:3847/health
```

Không đóng Terminal đang chạy server. Nếu đóng, hệ thống dừng điều phối.

## Chạy hằng ngày

Mỗi lần muốn dùng:

1. Mở Terminal trong thư mục `agent-orchestrator`.
2. Chạy server:

```bash
npm run serve
```

3. Chọn workspace đúng project bạn muốn AI làm việc.
4. Đợi server hiện trạng thái đang lắng nghe port `3847`.
5. Tạo file plan trong workspace.
6. Theo dõi tiến độ trong Terminal hoặc thư mục `.orchestrator`.

Nếu bạn vừa kéo code mới về từ Git, nên chạy lại:

```bash
npm install
npm run build
```

Sau đó mới chạy:

```bash
npm run serve
```

## Giao việc cho AI

Bạn giao việc bằng cách tạo file Markdown trong workspace:

```text
<workspace>/.orchestrator/plans/pending/
```

Ví dụ workspace là:

```text
D:\workspace\my-app
```

Thì thư mục giao việc là:

```text
D:\workspace\my-app\.orchestrator\plans\pending
```

Nếu chưa thấy thư mục `.orchestrator`, hãy chạy server một lần. Server sẽ tự tạo cấu trúc này.

### Cách đặt tên file plan

Nên đặt tên dễ đọc, có ngày hoặc số thứ tự:

```text
2026-05-23_login-page.md
2026-05-23_fix-checkout-validation.md
001_update-readme.md
```

### Mẫu plan đơn giản

Tạo file:

```text
<workspace>/.orchestrator/plans/pending/2026-05-23_login-page.md
```

Nội dung:

```markdown
# Thêm trang đăng nhập

## Mục tiêu
Tạo trang đăng nhập cho người dùng.

## Yêu cầu
- Có ô email.
- Có ô mật khẩu.
- Có nút đăng nhập.
- Validate email không được rỗng.
- Validate mật khẩu không được rỗng.
- Hiển thị thông báo lỗi dễ hiểu.

## File có thể cần sửa
- src/pages/Login.tsx
- src/routes.ts
- src/api/auth.ts

## Kết quả mong muốn
- Người dùng mở được trang đăng nhập.
- Form báo lỗi khi nhập thiếu.
- Code rõ ràng, dễ đọc.
```

### Viết plan tốt hơn

Plan càng rõ, AI càng ít đoán sai.

Nên ghi:

- Mục tiêu cuối cùng.
- File hoặc khu vực liên quan.
- Điều kiện hoàn thành.
- Điều gì không được làm.
- Cách bạn muốn kiểm tra kết quả.

Ví dụ:

```markdown
## Không được làm
- Không đổi framework.
- Không sửa database schema.
- Không đổi giao diện các trang khác.

## Cách kiểm tra
- Mở trang /login.
- Thử bấm đăng nhập khi email trống.
- Thử bấm đăng nhập khi mật khẩu trống.
```

Sau khi bạn lưu file vào `pending`, server sẽ tự phát hiện. Bạn không cần bấm thêm gì trong thư mục đó.

## Theo dõi tiến độ

Có nhiều nơi để xem hệ thống đang làm gì.

### 1. Terminal đang chạy server

Đây là nơi dễ xem nhất. Bạn sẽ thấy các dòng như:

- Server đã khởi động.
- Plan watcher phát hiện plan.
- Dispatch loop đang giao task.
- Runtime/harness được spawn.
- Harness gửi ready/progress/complete callback.
- Task thành công, lỗi, hoặc bị requeue.

Nếu Terminal không có dòng mới trong thời gian dài, xem phần [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp).

### 2. Health URL

Mở trình duyệt:

```text
http://127.0.0.1:3847/health
```

Bạn có thể xem:

- Server còn sống không.
- Uptime.
- Version.
- Plan watcher status.
- Số worker đang kết nối.
- Dispatch loop đang chạy không.
- Ollama có sẵn không.
- Tài nguyên runtime hiện tại.

Nếu trang này không mở được, server chưa chạy hoặc port bị sai.

### 3. Thư mục `.orchestrator`

Trong workspace, server tạo thư mục:

```text
<workspace>/.orchestrator/
```

Cấu trúc quan trọng:

```text
.orchestrator/
  plans/
    pending/       nơi bạn bỏ plan mới
    processing/    plan đang được xử lý
    done/          plan đã xử lý xong
  exchange/
    inbox/         task đang chờ chạy
    active/        task đang chạy
    outbox/        kết quả task
    checkpoints/   bản lưu trạng thái
    logs/          log theo ngày
    signals/       tín hiệu nội bộ
    _queue.json    hàng đợi task
  registry/
    workspace.json thông tin workspace
    workers.json   worker/runtime đã đăng ký
    tasks.json     task registry
  results/         kết quả đồng bộ theo workspace
  context/         ngữ cảnh workspace
  skills/          skill workspace-local nếu có
```

Bạn chủ yếu cần xem:

- `.orchestrator/plans/pending`
- `.orchestrator/plans/processing`
- `.orchestrator/plans/done`
- `.orchestrator/exchange/outbox`
- `.orchestrator/exchange/logs`
- `.orchestrator/results`

## Xem kết quả

Kết quả task nằm trong:

```text
<workspace>/.orchestrator/exchange/outbox/
```

Kết quả đồng bộ dễ đọc hơn có thể nằm trong:

```text
<workspace>/.orchestrator/results/
```

Log theo ngày nằm trong:

```text
<workspace>/.orchestrator/exchange/logs/
```

Tên file log thường theo ngày. Mở file mới nhất để xem timeline.

Task trong `outbox` thường kết thúc với các trạng thái:

| Trạng thái | Nghĩa là gì |
| --- | --- |
| `done` | Task đã xong |
| `failed` | Task lỗi |
| `blocked` | Task bị chặn, cần người xem lại |

Riêng callback từ harness có thêm trạng thái `handover_required`. Trạng thái này nghĩa là AI hết ngữ cảnh hoặc cần chuyển tiếp cho phiên khác; server sẽ requeue task kèm `handover_context` thay vì xem như một kết quả cuối bình thường.

Với Phase 2, server chỉ chấp nhận kết quả khi callback khớp đúng:

- `worker_id`
- `task_id`
- `runtime_id`
- `lease_generation`

Nếu không khớp, server từ chối để tránh ghi nhầm kết quả.

## Xử lý lỗi thường gặp

### Server không chạy

Dấu hiệu:

- Không mở được `http://127.0.0.1:3847/health`.
- Terminal báo lỗi ngay khi chạy `npm run serve`.

Cách xử lý:

1. Kiểm tra bạn đang ở đúng thư mục `agent-orchestrator`.
2. Chạy:

```bash
npm install
npm run build
npm run serve
```

3. Nếu vẫn lỗi, đọc dòng lỗi trong Terminal.

### Port 3847 bị chiếm

Dấu hiệu:

```text
EADDRINUSE
```

Nghĩa là đã có chương trình khác dùng port `3847`.

Cách xử lý nhanh:

- Đóng Terminal server cũ nếu còn mở.
- Hoặc chạy server bằng port khác:

```bash
node dist/index.js serve --port 4000
```

Khi đổi port, URL health sẽ là:

```text
http://127.0.0.1:4000/health
```

MCP endpoint sẽ là:

```text
http://127.0.0.1:4000/mcp
```

### Không thấy thư mục `.orchestrator`

Dấu hiệu:

- Trong workspace không có `.orchestrator`.

Cách xử lý:

1. Chạy server.
2. Khi được hỏi workspace, chọn đúng project.
3. Server sẽ tự tạo `.orchestrator`.

Nếu bạn chọn nhầm workspace, hãy dừng server bằng `Ctrl+C`, chạy lại, rồi chọn đúng đường dẫn.

### Bỏ plan vào nhưng không chạy

Kiểm tra:

1. File có nằm đúng thư mục không?

```text
<workspace>/.orchestrator/plans/pending/
```

2. File có đuôi `.md` không?
3. Server có đang chạy không?
4. Bạn có chọn đúng workspace lúc khởi động server không?
5. Plan watcher có hiện trong `http://127.0.0.1:3847/health` không?

Nếu file bị chuyển sang `processing`, nghĩa là server đã nhận plan.

Nếu task nằm trong `inbox` nhưng không chạy, có thể backend runtime chưa sẵn sàng.

### Ollama không sẵn sàng

Dấu hiệu:

- Terminal báo `Ollama not available`.
- Task không được dispatch cho backend local.

Cách xử lý:

1. Mở Ollama.
2. Kiểm tra Ollama chạy ở:

```text
http://localhost:11434
```

3. Nếu dùng model local, đảm bảo model đã được tải.

Ví dụ:

```bash
ollama pull qwen3.5:4b-q4_k_m
```

Hoặc dùng model fallback đã có trên máy.

### Task bị kẹt trong `active`

Dấu hiệu:

- File task nằm lâu trong:

```text
<workspace>/.orchestrator/exchange/active/
```

- Không thấy callback hoàn tất.

Cách xử lý an toàn:

1. Xem Terminal server có báo runtime/harness lỗi không.
2. Mở health URL để xem dispatch loop và active worker.
3. Nếu chắc task đã kẹt, dùng tool quản trị `force_release_task` qua MCP client/agent.

Không nên tự kéo file từ `active` về `inbox` nếu bạn chưa hiểu rõ trạng thái queue.

### Callback bị từ chối

Dấu hiệu:

- Terminal báo lease mismatch.
- Server trả `accepted: false`.

Nghĩa là harness gửi callback không khớp runtime lease hiện tại. Thường do callback trễ, task đã được requeue, hoặc runtime cũ đã hết quyền.

Cách xử lý:

- Để server tự recovery nếu task còn retry.
- Xem outbox/logs để biết task đã được xử lý lại chưa.
- Nếu task kẹt lâu, dùng `force_release_task`.

### Task failed nhiều lần

Mặc định task retry tối đa 3 lần. Sau đó task có thể bị đánh dấu failed vĩnh viễn.

Cách xử lý:

1. Mở kết quả trong `exchange/outbox`.
2. Đọc `summary` và `error_context`.
3. Sửa lại plan hoặc tạo plan mới rõ hơn.
4. Nếu cần chạy lại task, dùng tool `request_retry` qua MCP client/agent.

## Điều không nên làm

Không nên:

- Đóng Terminal server khi task đang chạy.
- Đổi tên hoặc di chuyển `.orchestrator` khi server đang chạy.
- Tự sửa file trong `.orchestrator/exchange/active`.
- Tự sửa `_queue.json` nếu chưa hiểu queue.
- Bỏ nhiều plan lớn cùng lúc khi máy yếu.
- Chạy quá nhiều worker/runtime nếu dùng Ollama local.
- Sửa cùng một file bằng tay trong lúc AI đang làm task liên quan.
- Xóa `registry/`, `checkpoints/`, hoặc `logs/` khi đang chạy.

Nên:

- Giao plan nhỏ, rõ, có tiêu chí hoàn thành.
- Chạy xong một nhóm việc rồi mới giao nhóm tiếp theo.
- Đọc log khi có lỗi.
- Dừng server bằng `Ctrl+C` để server shutdown sạch.

## Phần kỹ thuật ngắn

Phần này dành cho người biết kỹ thuật hoặc người cần debug nhanh.

### Lệnh thường dùng

```bash
npm install
npm run build
npm run serve
```

Chạy TypeScript trực tiếp khi phát triển:

```bash
npm run dev
```

Theo dõi Antigravity watcher nếu cần:

```bash
npm run watch:ag
```

Typecheck:

```bash
npm run typecheck
```

### Endpoint

| Endpoint | Tác dụng |
| --- | --- |
| `GET /health` | Kiểm tra server, queue, runtime, Ollama, resource |
| `/mcp` | MCP Streamable HTTP endpoint |
| `POST /api/worker/ready` | Harness báo đã sẵn sàng |
| `POST /api/worker/progress` | Harness báo tiến độ |
| `POST /api/worker/complete` | Harness báo hoàn tất/thất bại/handover |

### MCP tools chính

| Tool | Tác dụng |
| --- | --- |
| `register_workspace` | Đăng ký workspace đã cấu hình |
| `register_worker` | Đăng ký worker theo contract assignment-first |
| `submit_task` | Nộp task payload để server materialize |
| `submit_decomposition` | Planner nộp danh sách task và DAG |
| `get_status` | Xem trạng thái server |
| `get_queue_status` | Xem số task pending/active/done |
| `report_progress` | Báo tiến độ task đang sở hữu |
| `complete_task` | Tool hoàn tất task kiểu MCP cũ, vẫn có kiểm tra ownership |
| `request_retry` | Requeue task lỗi |
| `force_release_task` | Gỡ task kẹt khỏi active |
| `scan_workspace` | Quét workspace tạo context |
| `session_checkpoint` | Lưu/tải/xóa checkpoint phiên |
| `close_workspace` | Đóng workspace nếu không còn active task |
| `reopen_workspace` | Mở lại workspace đã đóng |

### Runtime backend

Hệ thống hiện hỗ trợ các backend:

| Backend | Ý nghĩa |
| --- | --- |
| `ollama` | Chạy model local qua Ollama |
| `codex-cli` | Chạy qua Codex CLI |
| `ag-cli` | Chạy qua Antigravity CLI |

Model selector chọn profile dựa trên độ khó task:

- `lite`: task nhỏ, ít file.
- `standard`: task vừa.
- `cloud`: task phức tạp hoặc cần context lớn.

Các biến môi trường hữu ích:

| Biến | Tác dụng |
| --- | --- |
| `OLLAMA_BASE_URL` | URL Ollama, mặc định thường là `http://localhost:11434` |
| `ORCHESTRATOR_MODEL_LITE` | Model local nhẹ |
| `ORCHESTRATOR_MODEL_STANDARD` | Model local chuẩn |
| `ORCHESTRATOR_MODEL_CLOUD` | Model cloud/CLI |
| `ORCHESTRATOR_MODEL_FALLBACK` | Model dự phòng nếu model chính chưa cài |
| `ORCHESTRATOR_CLI_BACKEND` | Chọn `codex-cli` hoặc `ag-cli` |
| `ORCHESTRATOR_CLI_COMMAND` | Command CLI custom |
| `ORCHESTRATOR_CLI_ARGS` | Tham số CLI custom |
| `ORCHESTRATOR_MAX_WORKERS` | Số worker tối đa |

### Nguyên tắc Phase 2

- Server là nguồn sự thật chính.
- Task được dispatch theo queue, không phải worker tự chọn.
- Mỗi task active có runtime lease riêng.
- Harness phải gửi `ready` trước khi chạy chính thức.
- `progress` dùng để quan sát, terminal callback mới là tín hiệu quyết định.
- `complete`, `failed`, `handover_required` là các trạng thái terminal quan trọng.
- Callback phải khớp `runtime_id` và `lease_generation`.
- Runtime được cleanup sau khi task xong hoặc lỗi.
- Model có thể được giữ ấm trong warm cache nếu policy cho phép.

## License

MIT
