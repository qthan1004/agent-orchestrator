# Tools

Scripts hỗ trợ Agent Orchestrator. Tất cả chạy từ **project root**.

---

## Bash Tools

### git-push.sh — Push code

```bash
bash tools/git-push.sh "<type>(<scope>): <subject>"
```

Git add + commit + push. Không cần submodule.

---

## Node.js Tools (Token-saving automation)

Các scripts Node.js thay thế agent loops để tiết kiệm tokens.
Agent gọi 1 lần → script làm hết → trả kết quả JSON.

### health-check.mjs

```bash
node tools/health-check.mjs [--port 3847]
```

Check MCP server status. Trả về JSON: `{ running, url, uptime }`.

### queue-status.mjs

```bash
node tools/queue-status.mjs [--exchange ./exchange]
```

Scan exchange/ dirs → trả về summary: `{ inbox, active, outbox, total }`.

### init-exchange.mjs

```bash
node tools/init-exchange.mjs [--root .]
```

Tạo exchange directory structure: `inbox/`, `active/`, `outbox/`, `checkpoints/`.

### task-scanner.mjs

```bash
node tools/task-scanner.mjs [--exchange ./exchange] [--format table|json]
```

Scan & summarize tất cả tasks: ID, status, module, timestamps.
Thay thế agent phải `ls` + `cat` từng file.
