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

**Logic** (đã PoC tại brain/scratch/brain-watcher-poc.mjs):
```
1. Poll conversations/*.pb every 10s
2. Track: { uuid, lastSize, lastChangeAt, status }
3. Status machine:
   ACTIVE (size changed) → IDLE (no change 60s) → STUCK (no change 3min)
4. On STUCK:
   → Write brain/{uuid}/.stuck-signal.json
   → Desktop notification (node-notifier hoặc BurntToast)
   → Optional: write exchange/signals/ag-stuck.json cho orchestrator
```

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

## Phase 5: Semi-Auto Recovery (OPTIONAL, 🟡 CAUTION)

> **CHỈ implement sau khi Phase 1-4 ổn định.**
> **KHÔNG auto-click, KHÔNG auto-paste trên Ultra account.**

### 5.1 Auto-Open Window (human paste)

```javascript
import { execSync } from 'child_process';
import { platform } from 'os';

function prepareResume(sessionData) {
  const prompt = generateResumePrompt(sessionData);
  
  // Copy to clipboard (cross-platform)
  copyToClipboard(prompt);
  
  // Notify human
  notifier.notify({
    title: 'AG Ready to Resume',
    message: 'Resume prompt copied to clipboard. Open new AG chat and paste.',
    wait: true
  });
}

function copyToClipboard(text) {
  const escaped = text.replace(/'/g, "'\"'\"'");
  if (platform() === 'win32') {
    execSync(`powershell -Command "Set-Clipboard -Value '${escaped}'"`);
  } else if (platform() === 'darwin') {
    execSync(`echo '${escaped}' | pbcopy`);
  } else {
    // Linux: xclip hoặc xsel
    execSync(`echo '${escaped}' | xclip -selection clipboard`);
  }
}
```

### 5.2 Cooldown & Safety

```
- Max 3 resume attempts per hour
- Min 5 minutes between resume signals  
- Nếu 3 attempts fail → stop và notify human "Manual intervention needed"
- Log tất cả recovery events cho audit
```

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
