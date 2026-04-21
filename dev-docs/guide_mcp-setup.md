# MCP Setup Guide — Agent Orchestrator

> Quick-start guide to connect the **Agent Orchestrator** MCP server with Antigravity IDE.
> Works on **Windows**, **Linux**, and **macOS**.

---

## 1. Prerequisites

| Requirement       | Version        |
| ----------------- | -------------- |
| Node.js           | ≥ 18.x         |
| Git               | any            |
| Antigravity IDE   | latest         |

Make sure the orchestrator repo is cloned and dependencies are installed:

```bash
git clone https://github.com/qthan1004/agent-orchestrator.git
cd agent-orchestrator
npm install
```

---

## 2. Locating `mcp_config.json`

Antigravity reads its MCP server list from a **single shared config file**.
The path differs per operating system:

| OS        | Path                                                         |
| --------- | ------------------------------------------------------------ |
| **Windows** | `C:\Users\<YourUser>\.gemini\antigravity\mcp_config.json`  |
| **Linux**   | `~/.gemini/antigravity/mcp_config.json`                    |
| **macOS**   | `~/.gemini/antigravity/mcp_config.json`                    |

> Replace `<YourUser>` with your OS username (e.g. `Quoc Thanh`).

If the file does not exist yet, create it with an empty `mcpServers` object:

```json
{
  "mcpServers": {}
}
```

---

## 3. Adding the Orchestrator Entry

Add the `"agent-orchestrator"` key inside `mcpServers`:

```jsonc
{
  "mcpServers": {
    // ... other servers you may already have ...

    "agent-orchestrator": {
      "command": "npx",
      "args": ["tsx", "src/index.ts", "serve"],
      "cwd": "D:\\workspace\\agent-orchestrator",   // ← adjust per your machine
      "tools": {
        "ping": { "background": "always" }
      }
    }
  }
}
```

### Key fields explained

| Field    | Purpose |
| -------- | ------- |
| `command` / `args` | Launches the server via `tsx` (TypeScript runner). Equivalent to `npm run dev`. |
| `cwd`    | **Working directory** — must point to the cloned `agent-orchestrator` folder on your machine. See [§4](#4-setting-the-correct-cwd) for per-OS examples. |
| `tools.ping.background` | See [§5](#5-why-background-always-for-ping) below. |

---

## 4. Setting the Correct `cwd`

The `cwd` value tells Antigravity **where** to run the server command.
It must be the **absolute path** to your local clone of `agent-orchestrator`.

### Examples per OS

| OS          | Example `cwd` value                                |
| ----------- | --------------------------------------------------- |
| **Windows** | `"D:\\workspace\\agent-orchestrator"`               |
| **Linux**   | `"/home/youruser/workspace/agent-orchestrator"`     |
| **macOS**   | `"/Users/youruser/workspace/agent-orchestrator"`    |

> **Windows note:** JSON requires double-backslashes (`\\`).
> Alternatively you can use forward-slashes: `"D:/workspace/agent-orchestrator"`.

### How to find the path?

```bash
# In the cloned repo, run:
# Windows (PowerShell)
(Get-Location).Path

# Linux / macOS
pwd
```

Copy the output and paste it as the `cwd` value.

---

## 5. Why `background: "always"` for `ping`?

```json
"tools": {
  "ping": { "background": "always" }
}
```

The `ping` tool sends periodic heartbeats from the agent to the server, signaling "I'm still alive." Without it, the server marks an agent as **stale** after 90 seconds of silence and reclaims its tasks.

Setting `"background": "always"` tells Antigravity to call `ping` **automatically in the background** — the agent doesn't need to explicitly invoke it. This keeps the session alive even during long-running tool calls or when the agent is waiting for user input.

> **TL;DR:** Without this flag, your agent may lose its assigned task mid-execution because the server thinks it crashed.

---

## 6. Restart Antigravity

After editing `mcp_config.json`:

1. **Close all Antigravity windows** completely, then reopen them.
2. Or use `Ctrl+Shift+P` → **"Reload Window"** in each window.

The new config is loaded on startup. All windows share the same config, so you only need to edit it **once**.

---

## 7. Verify the Connection

### Option A — Ask the AI

Open Antigravity chat and type:

> "Call `hello_world` with name 'test'"

Expected response: `"Hello, test! MCP Orchestrator is running."`

### Option B — Health Check Script

```bash
node reference/tools/health-check.mjs
```

Output is written to `exchange/.tmp/health.md`:
- ✅ Running → server is healthy
- ❌ Failed → server is not reachable

### Option C — Check Terminal

The terminal running the server should show:

```
🚀 Server is running on port 3847
```

---

## 8. Troubleshooting

### Server doesn't start — `EADDRINUSE`

Port 3847 is already in use by another process.

**Fix A** — Change port:

```bash
# Direct invocation with custom port
npx tsx src/index.ts serve --port 4000
```

Then update `mcp_config.json`:

```jsonc
"args": ["tsx", "src/index.ts", "serve", "--port", "4000"]
```

**Fix B** — Kill the process using the port:

```bash
# Windows (PowerShell)
netstat -ano | findstr :3847
taskkill /PID <PID> /F

# Linux / macOS
lsof -i :3847
kill -9 <PID>
```

---

### Antigravity shows no orchestrator tools

Checklist (in order):

1. ✅ Is the server running? → Terminal must show `🚀 Server is running`
2. ✅ Is `cwd` correct? → Must point to the repo root (the folder containing `package.json`)
3. ✅ Is `mcp_config.json` valid JSON? → Validate at [jsonlint.com](https://jsonlint.com)
4. ✅ Did you restart Antigravity? → Close **all** windows, then reopen

---

### Agent calls hang (pending forever)

1. Check logs at `exchange/logs/YYYY-MM-DD.md` for the last event
2. Stop server with `Ctrl+C`, then restart: `npx tsx src/index.ts serve`
3. The Recovery module auto-cleans stuck tasks on startup

---

### `register_worker()` returns "connection refused"

- Server is not running → start it first
- Firewall blocking port 3847 → try a different port or check firewall rules

---

## 9. Full Example — Windows

```json
{
  "mcpServers": {
    "agent-orchestrator": {
      "command": "npx",
      "args": ["tsx", "src/index.ts", "serve"],
      "cwd": "C:\\Users\\Quoc Thanh\\Projects\\agent-orchestrator",
      "tools": {
        "ping": { "background": "always" }
      }
    }
  }
}
```

## 10. Full Example — Linux / macOS

```json
{
  "mcpServers": {
    "agent-orchestrator": {
      "command": "npx",
      "args": ["tsx", "src/index.ts", "serve"],
      "cwd": "/home/youruser/workspace/agent-orchestrator",
      "tools": {
        "ping": { "background": "always" }
      }
    }
  }
}
```

---

## See Also

- [README.md](../README.md) — Full project documentation
- [prompts/agent-prompt.md](../prompts/agent-prompt.md) — Agent prompt template
