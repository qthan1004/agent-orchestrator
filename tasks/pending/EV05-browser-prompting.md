# Task EV05: Browser Prompting (Optional)

## Info
- **ID:** EV05-browser-prompting
- **Module:** AG global config
- **Group:** 1 (AG Ecosystem Setup)
- **Dependencies:** none
- **Priority:** 5 (optional)
- **Ref:** `dev-docs/plan_evolution-and-local-brain.md` — Phase 1, §1.7

## What to do

Tạo browser prompting config cho AG — cung cấp context khi agent browse localhost.

### Browser prompting path

```
Windows: %USERPROFILE%\.gemini\antigravity\prompting\browser\localhost.md
Linux:   ~/.gemini/antigravity/prompting/browser/localhost.md
```

### [NEW] `prompting/browser/localhost.md`

```markdown
---
hostname: localhost
description: Local development servers and dashboards
---
## Orchestrator Dashboard
- Port 3847: Agent orchestrator MCP server
- Check task queue status at /api/tasks
```

## Files
| Action | Path |
|--------|------|
| NEW    | `<AG_DATA_DIR>/prompting/browser/localhost.md` |

## Verification
- [ ] File tồn tại ở đúng path
- [ ] YAML frontmatter có hostname: localhost

## Done Criteria
- [ ] `localhost.md` tồn tại
- [ ] AG browser tool hiểu context khi browse localhost:3847
