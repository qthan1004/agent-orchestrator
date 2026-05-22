# Hướng Dẫn Dev: Register Workspace + Smoke Test Harness

> Ngày: 2026-05-21
> Phạm vi: start local dev sau khi có `register_workspace` và tách Harness boundary

## Mục tiêu

Start orchestrator ở môi trường dev, connect workspace qua MCP tool
`register_workspace`, submit một task nằm trong workspace-local `.orchestrator/`,
rồi kiểm tra server có spawn Harness không.

Guide này dùng runtime hiện tại: **mỗi server process chỉ chạy một workspace**.
Vì vậy `workspace_path` truyền vào `register_workspace` phải trùng với workspace
đã chọn khi start server.

## Từ vựng

| Khái niệm | Ý nghĩa |
|---|---|
| Server tool | Logic nội bộ phía server. Có thể được gọi bởi MCP adapter, CLI, Docker entrypoint, hoặc HTTP route sau này. |
| MCP tool | Adapter expose ra MCP. Nên mỏng: nhận input, gọi server tool, format output. |
| Workspace connector | Server tool tại `src/server-tools/workspace-connector.ts`. Chịu trách nhiệm connect/register/bootstrap workspace. |
| `register_workspace` | MCP tool gọi workspace connector. Dùng bước này trước khi submit task. |
| `register_worker` | MCP tool tạo worker identity. Nó cũng dùng lại workspace connector, nhưng không nên xem là API init workspace chính. |

## Contract start hiện tại

Server hiện vẫn start bằng prompt tương tác:

```bash
npm run build
npm run serve
```

Khi thấy prompt:

```text
? Configuration (default/custom) [default]:
```

Chọn:

- `default`: dùng repo root làm workspace.
- `custom`: nhập absolute path tới workspace muốn test.

Lưu ý:

- Dispatch loop của server chỉ gắn với một workspace tại thời điểm start.
- `register_workspace(workspace_path)` phải dùng đúng path đó.
- Muốn test workspace khác thì restart server và chọn path khác.
- Process manager spawn `dist/harness/index.js`, nên phải `npm run build` trước `npm run serve`.

## Bước 1: Start server

Từ repo root:

```bash
npm run build
npm run serve
```

Smoke test đầu tiên nên chọn `default`.

### Kiểm tra Ollama

Server chỉ gọi model khi có task được dispatch sang Harness. Ở lúc startup,
server chỉ health-check Ollama bằng `/api/tags`.

Nếu Ollama đã chạy sẵn, log kỳ vọng:

```text
[Ollama] Already running at http://localhost:11434
```

Nếu Ollama chưa chạy, server sẽ thử gọi:

```text
ollama serve
```

Rồi chờ health-check pass.

Nếu Ollama tắt hoàn toàn và server không start được `ollama serve`, server vẫn chạy
để MCP client connect được, nhưng dispatch loop sẽ không spawn Harness. Log kỳ vọng:

```text
[DispatchLoop] Ollama unavailable; waiting before dispatch.
```

Task sẽ nằm ở pending/inbox cho tới khi Ollama reachable trở lại.

Check thủ công:

```powershell
ollama list
```

Nếu dùng Docker Desktop hoặc Ollama chạy ở host khác, set env trước khi start:

```powershell
$env:OLLAMA_BASE_URL="http://host.docker.internal:11434"
npm run serve
```

Với local Windows bình thường, thường dùng:

```powershell
$env:OLLAMA_BASE_URL="http://localhost:11434"
npm run serve
```

Model chỉ được gọi sau khi `submit_task` thành công và dispatch loop spawn
Harness. Khi đó Harness gọi Ollama `/api/chat`.

Sau khi start, server sẽ đảm bảo có cấu trúc:

```text
<workspace>/.orchestrator/
  registry/
  exchange/
  plans/
  skills/
  context/
  results/
```

## Bước 2: Cấu hình MCP client

Guide này giả định server đã chạy bằng terminal ở bước 1. Vì vậy MCP client chỉ
cần connect tới server đang chạy, không tự spawn thêm server mới.

### Nếu dùng Codex

Codex không dùng `mcp_config.json` của Antigravity. Cách đơn giản nhất là add
MCP server bằng Codex CLI:

```bash
codex mcp add agent-orchestrator --url http://127.0.0.1:3847/mcp
```

Kiểm tra lại:

```bash
codex mcp list
```

Sau đó restart phiên Codex để server MCP mới được load.

Nếu muốn cấu hình thủ công, thêm vào:

```text
~/.codex/config.toml
```

Nội dung:

```toml
[mcp_servers.agent-orchestrator]
url = "http://127.0.0.1:3847/mcp"
```

Khi đã vào Codex session mới, thử yêu cầu Codex gọi tool:

```text
Gọi MCP tool hello_world với name là "test".
```

Response kỳ vọng:

```text
Hello, test! MCP Orchestrator is running.
```

## Bước 3: Prompt cho Planner/Codex

Sau khi MCP client connect được, đưa prompt này cho Codex/Planner.

Mục tiêu của Planner là **chuẩn bị và submit task**, không tự thực hiện task.
Task implementation phải để server dispatch sang Harness/Worker.

Prompt mẫu:

```text
Bạn đang đóng vai Planner cho agent-orchestrator.

Mục tiêu: tạo một smoke task để kiểm tra Harness runtime.

Ràng buộc bắt buộc:
- Không tự thực hiện task implementation.
- Không tự tạo output file `tmp/harness-output.txt`.
- Không tự gọi `complete_task`.
- Không tự tạo task markdown dưới `.orchestrator/tasks/`; server phải materialize task file.
- Chỉ được:
  1. xác định workspace root,
  2. gọi `register_workspace`,
  3. tạo workspace-local static skill nếu chưa có,
  4. gọi `submit_task`,
  5. dừng lại và báo kết quả.
- Task phải khai báo `skill_paths` để Harness load skill.

Các bước thực hiện:

1. Tự xác định workspace root hiện hành.

   Ưu tiên theo thứ tự:
   - workspace/cwd mà agent client đang chạy trong phiên hiện tại
   - repo root chứa `.git` hoặc `package.json`
   - nếu có nhiều lựa chọn, chọn root của project đang được user mở

   Yêu cầu:
   - dùng absolute path
   - không hardcode path mẫu từ guideline
   - không hỏi user nếu agent đã có đủ context workspace/cwd

2. Gọi MCP tool `register_workspace` với:

   `workspace_path = <absolute workspace root vừa xác định>`

3. Ghi lại `workspace_id` từ response.

4. Nếu chưa có, tạo file skill tại:

   `.orchestrator/skills/smoke-basic/SKILL.md`

   Nội dung chính xác:

   ```md
   # Smoke Basic Skill

   When writing `tmp/harness-output.txt`, write only the requested exact sentence.
   Do not add extra explanation, markdown, timestamps, or surrounding text.
   ```

   Nếu file đã tồn tại thì giữ nguyên, không ghi đè.

5. Gọi MCP tool `submit_task` để server tự materialize task file.

   Dùng payload sau:

   ```json
   {
     "task_id": "harness-smoke-01",
     "workspace_id": "<workspace_id từ bước 3>",
     "task_payload": {
       "action": "implement",
       "priority": 1,
       "tool_bundle": "generic-file",
       "target_files": ["tmp/harness-output.txt"],
       "skill_paths": ["smoke-basic/SKILL.md"],
       "body": "# Harness Smoke Test\n\nGoal: create `tmp/harness-output.txt`.\n\nWrite exactly this content:\n\nHarness boundary smoke test passed.\n\nDone criteria:\n- `tmp/harness-output.txt` exists\n- file content matches the exact expected sentence\n- call `complete_task` with a changelog"
     }
   }
   ```

6. Dừng lại ngay sau khi `submit_task` thành công.

Báo lại các thông tin sau:
- `workspace_path` agent đã tự xác định
- `workspace_id`
- `task_id`
- `task_content_path` server trả về
- full response của `submit_task`

Không gọi tool để thực hiện task. Không tự tạo `tmp/harness-output.txt`.
Không tự sửa file trong `.orchestrator/tasks/`.
Chỉ được tạo skill tĩnh trong `.orchestrator/skills/` nếu skill chưa có.
```

Prompt trên cố tình không ghi path cụ thể. Planner/Codex phải tự lấy workspace
hiện hành từ agent context/cwd rồi truyền absolute path đó vào `register_workspace`.

Lưu ý:

- Vẫn phải start orchestrator server thủ công trước bằng `npm run serve`.
- Codex chỉ connect tới `http://127.0.0.1:3847/mcp`.
- Không cần `mcp-remote` khi dùng Codex với Streamable HTTP URL.
- Nếu đổi port, chạy lại `codex mcp remove agent-orchestrator`, rồi add lại với URL mới.

### Nếu dùng Antigravity

Antigravity đọc MCP config tại:

| OS | Path |
|---|---|
| Windows | `C:\Users\<YourUser>\.gemini\antigravity\mcp_config.json` |
| Linux/macOS | `~/.gemini/antigravity/mcp_config.json` |

Nếu file chưa tồn tại, tạo file mới.

### Config mẫu

```json
{
  "mcpServers": {
    "agent-orchestrator": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://127.0.0.1:3847/mcp",
        "--transport",
        "http-first"
      ],
      "tools": {
        "ping": {
          "background": "always"
        }
      }
    }
  }
}
```

Nếu đổi port khi start server, sửa URL tương ứng:

```text
http://127.0.0.1:<port>/mcp
```

Sau khi sửa config:

1. Reload hoặc restart toàn bộ Antigravity window.
2. Gọi thử MCP tool:

```json
{
  "tool": "hello_world",
  "args": {
    "name": "test"
  }
}
```

Response kỳ vọng:

```text
Hello, test! MCP Orchestrator is running.
```

Lưu ý: không dùng config kiểu `"args": ["tsx", "src/index.ts", "serve"]` trong
guide này, vì kiểu đó để MCP client tự start server và sẽ vướng prompt chọn
workspace. Với flow hiện tại, start server thủ công trước rồi connect qua
`mcp-remote` là rõ nhất.

## Bước 4: Connect workspace qua MCP

Trong MCP client, gọi:

```json
{
  "tool": "register_workspace",
  "args": {
    "workspace_path": "<absolute workspace path agent tự xác định>"
  }
}
```

Response kỳ vọng:

```json
{
  "workspace_id": "<8-char-id>",
  "workspace_root": "<absolute workspace path>",
  "workspace_name": "<workspace folder name>",
  "status": "active",
  "orchestrator_root": "<absolute workspace path>\\.orchestrator",
  "dispatch_enabled": true,
  "server_root": "<absolute workspace path>",
  "contract_mode": "workspace-first"
}
```

Giữ lại `workspace_id` để dùng ở bước `submit_task`.

## Bước 5: Chuẩn bị static skill

### Static skill workspace-local (không phải case bank)

`.orchestrator/skills/` ban đầu trống là đúng. Workspace tự quyết định skill nào
cần cho từng task.

Phần này **không phải case bank**. Case bank/knowledge promotion chưa implement,
nên hiện chưa có flow "add knowledge" chính thức. Smoke test chỉ tạo một file
skill tĩnh trong workspace để kiểm tra Harness có load được `skill_paths`.

Tạo thử skill:

```text
.orchestrator/skills/smoke-basic/SKILL.md
```

Nội dung:

```markdown
# Smoke Basic Skill

When writing `tmp/harness-output.txt`, write only the requested exact sentence.
Do not add extra explanation, markdown, timestamps, or surrounding text.
```

Khi muốn Harness load skill này, khai báo `skill_paths` trong `task_payload`
khi gọi `submit_task`. Planner không tự tạo task file; server sẽ materialize
payload thành `.orchestrator/tasks/<task_id>.md`.

Ghi chú:

- `skill_paths` là path tương đối từ `.orchestrator/skills/`.
- Nếu muốn ghi đầy đủ cũng được: `skills/smoke-basic/SKILL.md`.
- Tương tự, context tĩnh đặt dưới `.orchestrator/context/` và khai báo bằng
  `context_paths`.
- Hiện chưa có MCP/server tool để add skill hoặc promote case bank.
- Cách dev-smoke-test là tạo file skill tĩnh thủ công trong workspace.

## Bước 6: Submit task qua MCP

Gọi `submit_task` bằng payload:

```json
{
  "tool": "submit_task",
  "args": {
    "task_id": "harness-smoke-01",
    "workspace_id": "<workspace_id từ register_workspace>",
    "task_payload": {
      "action": "implement",
      "priority": 1,
      "tool_bundle": "generic-file",
      "target_files": ["tmp/harness-output.txt"],
      "skill_paths": ["smoke-basic/SKILL.md"],
      "body": "# Harness Smoke Test\n\nGoal: create `tmp/harness-output.txt`.\n\nWrite exactly this content:\n\nHarness boundary smoke test passed.\n\nDone criteria:\n- `tmp/harness-output.txt` exists\n- file content matches the exact expected sentence\n- call `complete_task` with a changelog"
    }
  }
}
```

Response kỳ vọng:

```json
{
  "status": "registered",
  "task_id": "harness-smoke-01",
  "task_content_path": ".orchestrator/tasks/harness-smoke-01.md",
  "materialized_by": "server",
  "target_files_count": 1,
  "depends_on_count": 0
}
```

File movement kỳ vọng:

```text
.orchestrator/tasks/harness-smoke-01.md

.orchestrator/exchange/inbox/task-harness-smoke-01.json
  -> .orchestrator/exchange/active/task-harness-smoke-01.json
  -> .orchestrator/exchange/outbox/task-harness-smoke-01.json

.orchestrator/exchange/outbox/result-harness-smoke-01.json
```

## Bước 7: Kiểm tra Harness đã chạy

Quan sát log server, nên thấy:

```text
[DispatchLoop] Starting hybrid task dispatch loop...
[w-...] Worker spawned
```

Process được spawn phải là Harness entrypoint:

```text
dist/harness/index.js
```

Kiểm tra output trong workspace:

```powershell
Get-Content tmp\harness-output.txt
Get-ChildItem .orchestrator\exchange\outbox
Get-Content .orchestrator\exchange\outbox\result-harness-smoke-01.json
```

Pass khi:

- `tmp/harness-output.txt` tồn tại.
- Có result JSON trong `.orchestrator/exchange/outbox/`.
- Task status là `done`.
- Summary/changelog được callback về server qua `/api/worker/complete`.

## Troubleshooting

### Lỗi `Workspace mismatch`

Nguyên nhân: server start với workspace path A, nhưng `register_workspace` gọi path B.

Cách xử lý: restart server và chọn đúng workspace muốn test.

### Lỗi liên quan `task_content_path`

Nguyên nhân: client vẫn dùng legacy flow `task_content_path`, hoặc path trỏ ra
ngoài workspace-local runtime.

Cách xử lý: dùng `task_payload` để server tự materialize task file. Chỉ dùng
`task_content_path` cho test legacy.

### Lỗi `Task content already exists`

Nguyên nhân: submit lại cùng `task_id`, server thấy file
`.orchestrator/tasks/<task_id>.md` đã tồn tại nên không ghi đè.

Cách xử lý: dùng `task_id` mới cho lần smoke test mới, hoặc xử lý thủ công file
cũ sau khi xác nhận không cần giữ lại.

### Worker exit hoặc task bị requeue

Nguyên nhân thường gặp:

- Model được chọn chưa có hoặc chưa chạy được.
- Model ghi file ngoài `target_files`, dẫn tới `SCOPE_VIOLATION`.
- `task_payload` thiếu `action`, `body`, hoặc khai báo sai `target_files`.

Nếu Ollama chưa reachable, dispatch loop sẽ chờ trước khi spawn Harness. Trường hợp
này task chưa bị move sang active và chưa được tính là worker failure.

Check lại build:

```bash
npm run build
```

Rồi restart:

```bash
npm run serve
```

## Giới hạn hiện tại

- Startup vẫn dùng interactive prompt.
- Startup/bootstrap phải idempotent: khi `npm run serve` lại, server không được
  làm mất file/state cũ trong workspace-local `.orchestrator/`.
- Docker Desktop flow cần thêm startup non-interactive sau này, ví dụ
  `--workspace-root` hoặc `WORKSPACE_ROOT=/workspace`.
- Mỗi server process hiện chỉ dispatch cho một workspace.
- `register_workspace` hiện vẫn cần `workspace_path` explicit. Flow mong muốn:
  agent/planner tự lấy current workspace path hoặc gọi server current-workspace
  connector, không hardcode path trong prompt.
- `.orchestrator/tasks/` hiện được tạo khi server materialize task payload.
