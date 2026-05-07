# Plan: Antigravity Evolution & Local Brain Architecture

> **Created**: 2026-04-20
> **Status**: Draft
> **Goal**: Tiến hóa orchestrator theo hướng local-brain, tận dụng tối đa AG ecosystem mà không gây rủi ro cho Ultra account.
> **Deep Analysis**: [antigravity_deep_analysis.md](file:///C:/Users/Quoc%20Thanh/.gemini/antigravity/brain/8b6bbe5b-3761-4d8b-84eb-75576ee82192/antigravity_deep_analysis.md)

---

## Tổng quan

Dựa trên deep analysis toàn bộ file nội bộ AG IDE + web research, ta đã xác định được:
- 9 hành động **GREEN (100% SAFE)** có thể thực hiện ngay
- Kiến trúc đúng: **workspace-centric intelligence** (server dumb, agent smart nhờ memory file)
- Stuck detection: **brain watcher** (.pb file size) cho AG + **MCP stale** (universal)
- Policy: tất cả UI automation → **DEFER**, ưu tiên giải pháp native

## Nguyên tắc thiết kế

```
1. ULTRA ACCOUNT SAFETY FIRST
   → Chỉ dùng official AG features
   → Không harvest credentials, không proxy OAuth, không debug port

2. WORKSPACE-CENTRIC INTELLIGENCE  
   → Intelligence sống trong .agent/workspace-memory.md
   → Server chỉ scan + transform khi tool được gọi
   → Scan 1 lần, không chạy lại trừ khi yêu cầu update

3. UNIVERSAL CORE + AG BONUS LAYER
   → Core detection/recovery dùng MCP (universal, mọi IDE)
   → Brain watcher (.pb) là bonus layer cho AG
   
4. GIẢM COMPUTE, KHÔNG TĂNG
   → Memory injection giảm 50-70% discovery tool calls
   → Ít compute → ít rate limit → ít stuck

5. AGENT-SPECIFIC CODE ISOLATION
   → AG-specific code nằm riêng: src/agents/antigravity/
   → Core/universal code: src/services/, src/mcp-server/
   → Sau thêm Cursor/Claude Code → src/agents/cursor/, src/agents/claude-code/
   → Mỗi agent folder tự chứa: watcher, config resolver, protocol adapter
```

### Source Code Organization

```
src/
├── mcp-server/              ← Universal MCP tools (scan_workspace, session_checkpoint)
├── services/
│   └── rag/                 ← Universal RAG pipeline (git-context, gitnexus-bridge, etc.)
├── agents/
│   └── antigravity/         ← AG-SPECIFIC (tách riêng, dễ maintain)
│       ├── brain-watcher.mjs      ← Poll .pb files
│       ├── config-resolver.mjs    ← Resolve AG data dir paths (Win/Linux)
│       ├── stuck-detector.mjs     ← .pb heartbeat logic
│       └── notifications.mjs     ← Desktop notify khi stuck
│   └── (future)
│       ├── cursor/          ← Cursor-specific watchers/adapters
│       └── claude-code/     ← Claude Code-specific
└── index.mjs
```

---

## Phase 1: AG Ecosystem Setup (1 ngày, 🟢 100% SAFE)

> Tận dụng native AG features chưa thiết lập. Không cần code.

### 1.1 Tạo GEMINI.md

**File**: `<WORKSPACE>/GEMINI.md`
**Mục đích**: Inject orchestrator-specific instructions vào agent context. Ưu tiên cao hơn AGENTS.md.

```markdown
# Agent Orchestrator — Gemini Rules

## Project Context
- MCP-based agent orchestrator server (Node.js, ESM)  
- Server port: 3847
- Architecture: DAG-based task queue, file-based IPC

## Agent Behavior
- ALWAYS read `.agent/workspace-memory.md` at session start (if exists)
- ALWAYS write `.agent/session.json` after each major action
- On error: report via MCP `report_error` tool, do NOT retry blindly
- Check `.agent/session.json` at start for resume context from previous session
- Use `scan_workspace` tool if workspace-memory.md doesn't exist

## Coding Standards
- Pure ESM (`import`/`export`), no CommonJS
- Zod for schema validation
- Conventional Commits for git messages
- JSDoc for all public functions

## File Convention
- Dev plans → `dev-docs/`
- Dev tasks → `tasks/pending/`
- Product plans → `plan/pending/` (DO NOT mix with dev docs)
```

### 1.2 Tạo .agent/rules/

**Directory**: `<WORKSPACE>/.agent/rules/`
**Files**:

```markdown
# .agent/rules/recovery-protocol.md
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

### 1.3 Tạo global_workflows/

**Directory**: `<AG_DATA_DIR>/global_workflows/`

```
Paths by OS:
  Windows: %USERPROFILE%\.gemini\antigravity\global_workflows\
  Linux:   ~/.gemini/antigravity/global_workflows/
```

**Mục đích**: Workflows dùng được ở MỌI workspace, không riêng orchestrator.

```markdown
# global_workflows/resume-session.md
---
name: Resume Session
description: Resume công việc từ session trước bị gián đoạn
---

1. Đọc file `.agent/session.json` nếu tồn tại
2. Đọc file `.agent/workspace-memory.md` nếu tồn tại  
3. Tiếp tục task từ checkpoint đã ghi
4. Nếu không có session.json → thông báo "No previous session found"
```

### 1.4 Install Toolkit for Antigravity

```
Ctrl+Shift+X → Search "Toolkit for Antigravity" → Install
```

**Tận dụng**:
- Quota monitoring → biết khi nào sắp hết → pause before rate limit
- Service recovery → restart LS khi stuck  
- Cache management → clear stuck conversations

### 1.5 Review Policy

Kiểm tra và cân nhắc bật **"Always Proceed"** cho orchestrator workspace:
- `Settings > Agent > Review Policy`
- Hoặc giữ "Agent Decides" nếu muốn kiểm soát hơn

### 1.6 MCP Config Enhancement

**File**: `<AG_DATA_DIR>/mcp_config.json`

```
Paths by OS:
  Windows: %USERPROFILE%\.gemini\antigravity\mcp_config.json
  Linux:   ~/.gemini/antigravity/mcp_config.json
```

**Thêm**: `background: "always"` cho các tool heartbeat/ping.

```json
{
  "mcpServers": {
    "agent-orchestrator": {
      "command": "node",
      "args": ["<WORKSPACE>/src/index.mjs", "serve"],
      "cwd": "<WORKSPACE>",
      "tools": {
        "ping": { "background": "always" }
      }
    }
  }
}
```

### 1.7 Browser Prompting (optional)

**File**: `<AG_DATA_DIR>/prompting/browser/localhost.md`

```
Paths by OS:
  Windows: %USERPROFILE%\.gemini\antigravity\prompting\browser\localhost.md
  Linux:   ~/.gemini/antigravity/prompting/browser/localhost.md
```

```markdown
---
hostname: localhost
description: Local development servers and dashboards
---
## Orchestrator Dashboard
- Port 3847: Agent orchestrator MCP server
- Check task queue status at /api/tasks
```

---

## Phase 2: Workspace Memory Injection (1-2 tuần, 🟢 SAFE)

> Build MCP tools mới cho orchestrator server.

### 2.1 scan_workspace Tool

**File mới**: `src/mcp-server/tools/scan-workspace.mjs`

**Logic**:
```
Input: { force_update: boolean }

1. Check .agent/workspace-memory.md exists?
   → exists && !force_update → return CACHED
   
2. Scan file structure (fs.readdirSync recursive)
   → Build file map: path, type, purpose, size, lastModified

3. Parse dependency graph (regex import/require)
   → Build adjacency list: file → [dependencies]

4. Git co-change analysis
   → git log --name-only → count co-occurrences
   → Top 10 file pairs that change together

5. Load existing KIs (if any)
   → Read ~/.gemini/antigravity/knowledge/

6. Generate .agent/workspace-memory.md
   → Template: project overview, file map, dep graph, git intel, knowledge

7. Write file + return stats
```

**Output format**: Xem [workspace-memory.md template](#) trong deep analysis V4.

### 2.2 Session Checkpoint Tool

**File mới**: `src/mcp-server/tools/session-checkpoint.mjs`

**Logic**:
```
Input: {
  action: "save" | "load" | "clear",
  task_id: string,
  progress: number,
  context: object
}

save:
  → Write .agent/session.json với timestamp, task state, context

load:
  → Read .agent/session.json
  → Return context cho agent resume

clear:
  → Delete .agent/session.json (task completed)
```

### 2.3 MCP Stale Recovery Enhancement

**File sửa**: `src/mcp-server/state-manager.mjs`

**Thêm logic**:
```
Khi worker stale > 3 phút:
  → Write exchange/signals/recovery-needed.json
  → Contains: worker_id, last_task, stale_since, resume_hint
  → Agent mới đọc file này → tự pickup
```

### 2.4 Agent Prompt Update

**File sửa**: `prompts/agent-prompt.md` (hoặc tương đương)

**Thêm instructions**:
```markdown
## Session Protocol
1. Start: check .agent/session.json → resume if exists
2. Start: read .agent/workspace-memory.md → skip deep discovery
3. Working: call session_checkpoint(save) after each major action
4. Done: call session_checkpoint(clear)
5. Error: call report_error, do NOT retry blindly
```

---

## Phase 3: Brain Watcher (1 tuần, 🟢 SAFE, AG-specific)

> Background process watch .pb files cho stuck detection.

### 3.1 Brain Watcher Service

**File mới**: `src/agents/antigravity/brain-watcher.mjs`

**Logic (Hệ thống 3-Khóa / Diagnostic Matrix)**:
Để chống "giết nhầm" Agent đang suy nghĩ sâu hoặc chạy task dài, Watcher sử dụng 3 lớp khóa (locks) để quyết định trạng thái STUCK:

```
1. Khóa 1 (Log Watcher): Tailing file `network.log` & `renderer.log` mới nhất.
   - Nếu xuất hiện `503`, `Timeout`, `Failed to fetch` → Đánh dấu STUCK ngay lập tức (Hard crash).
2. Khóa 2 (Heartbeat/MCP Ping): 
   - Yêu cầu Agent gọi tool `heartbeat_ping` 1 phút/lần (soft call) khi chạy các task dài.
   - Thậm chí khi IDLE (chờ task), Agent cũng duy trì ping để Server biết còn sống.
   - Nếu Orchestrator nhận được ping/đang chạy tool → ALIVE.
3. Khóa 3 (.pb File Size): 
   - Nếu Khóa 1 an toàn + Khóa 2 (MCP) nhàn rỗi, Watcher check size file `.pb` mỗi 10s.
   - Nếu quá 3 phút không có thay đổi file size + Không có Ping → Lúc này mới kết luận STUCK.
```

**Hành động khi STUCK**:
- Đưa status về PAUSED (nếu user cấu hình Manual).
- Kích hoạt Phase 5 Auto-Recovery (nếu user đã Consent cài đặt Extension).

### 3.2 Desktop Notification

```javascript
// Cross-platform: node-notifier package (Windows/Linux/macOS)
import notifier from 'node-notifier';

notifier.notify({
  title: 'AG Session Stuck',
  message: `Session ${uuid.slice(0,8)} no activity for ${duration}`,
  actions: ['Open AG', 'Dismiss']
});
```

### 3.3 Integration với Orchestrator

Brain watcher chạy như service riêng trong `src/agents/antigravity/`:
- Standalone process (`node src/agents/antigravity/brain-watcher.mjs`)
- Tích hợp vào orchestrator server (import từ agents/antigravity/)
- npm script (`npm run watch:ag`)

---
## Phase 4: Local RAG — gitNaxus + Obsidian (2-3 tuần, 🟢 SAFE)

> **Plan riêng**: [plan_local-rag-gitnaxus-obsidian.md](file:///d:/workspace/agent-orchestrator/dev-docs/plan_local-rag-gitnaxus-obsidian.md)
> 
> Bao gồm: Git co-change analyzer, import graph parser, file scanner, Obsidian bridge, memory generator.
> Tất cả feed vào `scan_workspace` tool → sinh `.agent/workspace-memory.md`.

---

## Phase 5: Auto-Recovery (Consent-First Extension)

> **CHỈ implement sau khi Phase 1-4 ổn định.**
> **Kiến trúc:** Bắn prompt và tự động tiếp tục (Auto-Submit) qua một Mini VS Code Extension, không đụng chạm đến DOM hay cài cắm System OS tools.

### 5.0 Research Note — AG Runtime Signal Discovery

**Chưa chốt watcher target.** Không được kết luận agent đã die chỉ vì một file như `conversations/*.pb` không đổi size/mtime. Khi agent đang "thinking", AG vẫn có thể đang tiêu quota nhưng local conversation file chưa chắc đã được flush.

**Empirical finding từ AG test:** khi stream đang chạy bình thường, IDE có thể giữ token/stream trong RAM và không ghi thêm log xuống disk. Log file chỉ đáng tin để bắt lỗi hoặc timeout, không đáng tin để chứng minh agent còn sống.

Cần qua AG quan sát thực tế trước khi implement Phase 5:
- Khi agent đang thinking và quota vẫn burn, file/state nào thay đổi?
- `conversations/*.pb` có đổi trong lúc thinking/streaming/tool execution không?
- `cloudcode.log` có append trong lúc request đang chạy, hay chỉ ghi khi lỗi/kết thúc?
- Có runtime stream/socket state, telemetry cache, lock file, hoặc extension-visible status nào đổi đều hơn `.pb` không?
- Khi AG bị 503/quota exhausted/terminated/waiting approval thì dấu hiệu nằm ở file nào?

Candidate watcher sources:
- MCP/server liveness: heartbeat/progress/lease renew từ agent khi agent còn gọi được tool
- OS/network liveness: `ss`, `tcp`, `netstat`, hoặc nguồn tương đương để xem stream/socket còn nhận bytes hay không
- Chat/runtime files: `conversations/*.pb`
- AG logs: `cloudcode.log` và logs cùng session, chủ yếu để bắt `Error`, `Timeout`, `503`, quota/rate-limit exhausted
- Runtime/telemetry/cache state nếu tìm được
- Physical task state: `exchange/active`, lock/progress/checkpoint files
- Extension-visible chat status nếu VS Code/AG API expose được

Rule tạm thời: watcher phải là multi-signal heuristic. Stream/socket activity hoặc MCP heartbeat là positive liveness; log error/timeout là negative evidence; `.pb`/log silence chỉ được xem là `SILENT/SUSPECTED`, không phải bằng chứng đủ để auto-recover.

### 5.1 Kiến trúc Kép (Dual-Architecture) — Quyền quyết định ở User

Hệ thống cung cấp **2 Giải pháp (2 Paths)** để phục hồi Agent. Sự lựa chọn này không chỉ giải quyết vấn đề kỹ thuật mà còn là một **Engineering Showcase** về khả năng thấu hiểu ranh giới bảo mật của hệ thống.

#### 🌟 Lựa chọn 1: "Chánh Đạo" (The Righteous Path / Semi-Auto)
- **Cơ chế:** Sử dụng một Mini VS Code Extension hợp lệ (`recovery-agent.vsix`).
- **Hoạt động:** 
  1. Orchestrator gọi Extension để Dọn dẹp memory (Mở Chat mới): `vscode.commands.executeCommand('workbench.action.chat.newChat')`.
  2. Orchestrator copy Prompt vào Clipboard và bắn Desktop Notification.
  3. User click vào khung Chat, ấn `Ctrl+V` và `Enter` (1 thao tác tay).
- **Lợi ích:** Sạch sẽ 100%, bảo mật tuyệt đối, hoàn toàn tuân thủ API chuẩn của Microsoft/Antigravity.
- **Rủi ro:** Không tự động hóa được 100% do rào cản Sandbox của IDE.

#### 😈 Lựa chọn 2: "Tà Đạo" (The Dark Path / 100% Automation)
- **Cơ chế:** Kỹ thuật DOM Injection (Monkey Patching). Hack trực tiếp vào file hệ thống của IDE.
- **Hoạt động:**
  1. **The Injector:** Orchestrator tự động tìm file gốc `workbench.html` của IDE trên ổ cứng.
  2. **The Hack:** Chèn thêm thẻ `<script src="orchestrator-bridge.js">` vào mã nguồn HTML.
  3. **The Puppeteer:** Orchestrator gửi lệnh qua WebSocket tới script lậu. Script lậu này dùng Javascript DOM (`document.querySelector('textarea').value = '...'`) chọc thủng khung Chat và bấm Submit thay user.
  4. **The Antidote (Cleanup & Audit):** Hệ thống tạo sẵn file `.bak` để người dùng có thể gỡ bỏ Backdoor bất kỳ lúc nào, đồng thời cung cấp lệnh `grep` để họ tự kiểm chứng xem IDE có đang bị cấy mã hay không.
- **Lợi ích:** Đạt được cảnh giới Auto-Submit 100% (Zero-Touch). Máy tự gõ, tự sửa lỗi như có ma làm.
- **Rủi ro chí mạng:** 
  - **Rủi ro hệ thống:** Gây cảnh báo *"Your installation appears to be corrupt"*, gãy sau update, nhạy cảm với DOM/UI changes, có thể cần quyền Admin/sudo.
  - **Rủi ro tài khoản:** Provider/AG có thể ghi nhận client bị sửa, hành vi auto-submit bất thường, event log xuất phát từ script lạ; Ultra account có thể bị nghía, giảm trust, siết quota, revoke session, hoặc khóa account trong trường hợp xấu.
  - **Rủi ro policy/TOS:** Đây là bypass sandbox/API chính thống bằng DOM Injection. Có thể bị xem là sửa client trái phép hoặc né rào bảo mật.
  - **Cleanup không xóa provider-side logs:** Restore file local chỉ làm sạch máy; không đảm bảo xóa dấu vết telemetry/log đã gửi lên cloud.

**Quy tắc consent cho "Tà Đạo":**
- Không bật mặc định.
- Không gộp chung với consent cài extension Semi-Auto.
- Trước khi bật phải hiển thị đủ 3 nhóm risk: hệ thống, tài khoản, policy.
- User phải review kỹ và xác nhận riêng rằng họ hiểu/chấp nhận rủi ro hệ thống, account, policy. Sau khi chọn Backdoor Mode, user tự chịu trách nhiệm với mọi hậu quả về IDE/account/provider policy.
- Luôn cung cấp cách check/remove backdoor:
  - Check: `grep -i "orchestrator-bridge" <path-to-workbench.html>`
  - Remove: restore `workbench.html` từ `.bak`, restart IDE, chạy lại lệnh `grep` để xác nhận sạch.

### 5.1.1 Dispatch Modes — Push Extension vs Legacy Pull

Phase 5 phải giữ cả 2 luồng để không break worker hiện tại:

**Mode A — `push_extension` (ưu tiên nếu extension connected)**
- Server chủ động register/bind AG session.
- Server là bên duy nhất chọn và claim task.
- Server inject prompt chứa `task_id`, `task_details`, `worker_id/session_id`, lease/generation vào AG qua extension.
- Agent không gọi `get_next_task`; agent chỉ xử lý task được inject, gọi `ping`/`report_progress`, rồi `complete_task(auto_pickup: false)`.
- Sau khi `complete_task` hợp lệ, server mới dispatch task kế tiếp vào session đó.

**Mode B — `pull_legacy` / Manual Fallback**
- Khi user không cài extension, extension không connect được, hoặc auto-recovery bị tắt.
- Agent/user dùng luồng cũ: `register_worker` → `get_next_task` → `complete_task(auto_pickup: true)` hoặc user tự dán prompt resume.
- Giữ backward compatibility cho MCP agents/tests hiện tại.

Rule bắt buộc: trong `push_extension`, server owns dispatch. Không để agent vừa nhận `next_task` từ `complete_task` vừa nhận prompt mới từ extension, tránh double-dispatch.

### 5.2 Trải nghiệm Onboarding (Consent-First UX)

Sự minh bạch là ranh giới giữa một công cụ Automation tốt và Malware. Khi khởi động Server lần đầu, hệ thống hỏi theo 2 tầng consent riêng:

1. **Semi-Auto Extension consent**

> *"Để hỗ trợ phục hồi khi IDE bị kẹt, hệ thống có thể cài một extension cục bộ (AG Auto Recovery) để mở chat mới và chuẩn bị prompt. Nếu chọn [No], hệ thống vẫn hoạt động bình thường nhưng sẽ dùng Manual Fallback. Bạn có đồng ý cài extension này không? [Y/n]"*

2. **Backdoor/DOM Injection consent (rủi ro cao, chỉ hỏi nếu user bật 100% automation)**

> *"100% Auto-Submit yêu cầu sửa file cài đặt IDE (`workbench.html`) bằng DOM Injection. Việc này có rủi ro hệ thống, rủi ro tài khoản Ultra bị provider/AG chú ý, và rủi ro policy/TOS. Cleanup chỉ restore file local, không đảm bảo xóa provider-side logs. Bạn xác nhận hiểu và chấp nhận rủi ro này chứ? [type: I ACCEPT BACKDOOR RISK]"*

Disclaimer hiển thị kèm Backdoor Mode:

> *"Bạn đang chọn luồng Auto 100% để đổi lấy sự tiện lợi. Đây không phải luồng an toàn mặc định. Hãy đọc kỹ rủi ro trước khi bật. Sau khi xác nhận, mọi hậu quả về hệ thống, tài khoản, quota, hoặc policy/TOS do Backdoor Mode gây ra thuộc trách nhiệm của user."*

#### Bảng đánh giá lựa chọn của User

| Lựa chọn | Trạng thái khi bị Stuck | Lợi ích (Pros) | Đánh đổi (Cons) |
|---|---|---|---|
| **Manual Fallback** | Server `PAUSED` task, báo notification bắt user tự copy/paste. | - An toàn nhất.<br>- Không sửa IDE.<br>- Quyền kiểm soát hoàn toàn ở User. | - Kém tiện lợi.<br>- Nếu cắm máy qua đêm mà kẹt, task nằm chết đến sáng. |
| **Semi-Auto Extension** | Extension chuẩn bị chat/prompt, user submit thủ công. | - An toàn 100% theo thiết kế.<br>- Không sửa IDE core.<br>- Có thể degrade về Manual. | - Cần thao tác user.<br>- Không đạt auto 100%.<br>- Có thể bị command/API thay đổi. |
| **Backdoor DOM Injection** | Script injected tự điền và submit prompt. | - Zero-touch 100%.<br>- Phẻ người nhất.<br>- Phục hồi tự động nhất. | - Rủi ro hệ thống cao.<br>- Rủi ro account/provider chú ý.<br>- Rủi ro policy/TOS cao.<br>- User tự chịu trách nhiệm sau khi chọn. |

### 5.3 Graceful Degradation & Cooldown

- Nếu User chọn `[n]`, lưu config `auto_recovery: false`. Lần sau hệ thống tự động fall back về Manual (gửi Desktop Notification & log terminal).
- Nếu tắt Server (Orchestrator bị kill): Extension trở nên "vô tri" (bị liệt). IDE trở lại bình thường 100%, Extension không bao giờ tự động spam hay gửi mã độc lập.
- **Cooldown Limits**:
  - Max 3 resume attempts / 1 hour.
  - Min 2 minutes (120s) random delay giữa các lần retry.
  - Sau 3 lần retry fail → Dừng và Notify Human "Manual intervention needed".

### 5.4 Task Breakdown

> Mục tiêu: thêm `push_extension` mà không phá `pull_legacy`.

| Task | Scope | Done Criteria |
|---|---|---|
| EV13 — AG command spike | Test extension gọi chat commands thật trong AG | Biết command nào chạy được: new chat, open prompt, submit/continue; ghi fallback nếu command fail |
| EV14 — Runtime signal spike | Quan sát `network.log`, `renderer.log`, `.pb`, socket/stream khi thinking/error/approval | Có bảng evidence: alive/error/silent/waiting approval; không còn giả định watcher target |
| EV15 — Dispatch mode model | Thêm data model/config cho `pull_legacy` vs `push_extension` | Worker/session có dispatch mode; default vẫn `pull_legacy` |
| EV16 — Server-side claim/lease | Server claim task trước khi inject | Task active có owner session/worker, lease/generation; complete_task reject late/stale lease |
| EV17 — Extension bridge MVP | Local extension connect/poll server và nhận command | Extension connected thì server thấy session; không connected thì server degrade manual |
| EV18 — Push prompt contract | Tạo prompt template cho injected task | Prompt nói rõ không gọi `get_next_task`, gọi `ping`/progress/complete với `auto_pickup:false` |
| EV19 — Manual fallback prompt | Sinh file prompt resume cho user tự paste | Khi auto off/fail, server tạo prompt file rõ path và notify user |
| EV20 — Complete task guard | Chặn double-dispatch trong push mode | `complete_task` của push session không trả `next_task`; server tự dispatch task kế tiếp |
| EV21 — Hybrid stuck detector | Kết hợp log watcher + heartbeat + `.pb` silence | Hard error → recovery candidate; no ping + `.pb` unchanged > threshold → stuck; silence đơn lẻ không recover |
| EV22 — E2E tests | Test cả legacy và push/manual flows | Legacy tests vẫn pass; push mode không double-assign; extension missing → manual fallback |

**Compatibility notes**
- Giữ tool hiện tại là `ping`. Đây là soft heartbeat MCP dùng chung cho cả `pull_legacy` và `push_extension`; không đổi tên, không thêm alias nếu không cần.
- `get_next_task` giữ nguyên cho `pull_legacy`.
- `complete_task(auto_pickup: true)` giữ nguyên cho legacy, nhưng push mode phải force/require `auto_pickup: false`.

---

## Verification Plan

### Automated

```bash
# Phase 2: Test MCP tools
npm test                           # Unit tests
node src/index.mjs serve           # Start server
# → Gọi scan_workspace qua MCP
# → Verify .agent/workspace-memory.md generated
# → Gọi session_checkpoint(save/load/clear)

# Phase 3: Test brain watcher
node src/agents/antigravity/brain-watcher.mjs  # Start watcher
# → Mở AG conversation → verify ACTIVE detected  
# → Để yên 3 phút → verify STUCK detected
# → Desktop notification appears
```

### Manual

```
Phase 1:
  [ ] GEMINI.md được agent đọc (thấy trong agent response)
  [ ] global_workflows/ hoạt động khi gõ /resume-session
  [ ] Toolkit extension hiện quota gauge
  [ ] MCP background tool không block conversation

Phase 2-4:
  [ ] Agent mới đọc workspace-memory.md → giảm tool calls ~50%
  [ ] Session checkpoint hoạt động cross-session
  [ ] Brain watcher notify đúng khi stuck
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| GEMINI.md quá dài → context overflow | Giữ dưới 500 words, chỉ essential rules |
| workspace-memory.md stale | Thêm `last_updated` timestamp, agent check freshness |
| Brain watcher false positive | IDLE threshold 60s, STUCK threshold 3 min, Gaussian smoothing |
| scan_workspace chậm (repo lớn) | Ignore node_modules, .git, dist. Max 500 files. Cache result |
| Recovery loop vô hạn | Max 3 retries/hour, exponential backoff |

---

## Dependencies

| Phase | Dependency |
|-------|-----------|
| Phase 1 | Không (chỉ tạo files) |
| Phase 2 | Phase 1 (GEMINI.md phải có instructions) |
| Phase 3 | Phase 2 (brain watcher ghi signal cho orchestrator đọc) |
| Phase 4 | Phase 2 (gitNaxus/Obsidian feed vào scan_workspace) |
| Phase 5 | Phase 3 + 4 (recovery dựa trên brain watcher + session data) |
