# Task 01: Add Path Context

## Vấn đề
Agent không phân biệt được server root (chứa queue) và workspace root (project đích thực sự).

## Actions
1. **[MODIFY] `src/mcp-server/tools.mjs`**
   - Sửa tool `register_worker`.
   - Trả về `server_root: context.config.root` và `workspace_root: context.config.workspaceRoot || null` trong JSON output.
2. **[MODIFY] `src/config.mjs`**
   - Thêm `workspaceRoot: overrides.workspaceRoot || null` vào `loadConfig`.
3. **[MODIFY] `src/utils/startup-prompt.mjs`**
   - Thêm câu hỏi cho người dùng: `? Workspace root (project path for agents) [current dir]: `.
   - Điền giá trị fallback là `process.cwd()`.
4. **[MODIFY] `prompts/agent-prompt.md`**
   - Thêm **Section 1.1 Path Context** và **1.2 Workspace Assets** hướng dẫn agent sử dụng đúng path.
