# Symlink Generic Skills + Create JSON Templates

- **Phase**: B — Skills / Workflows / Templates
- **Goal**: Link generic skills vào .agent/ và tạo 4 JSON contract templates

## Files

| Action | Path |
|--------|------|
| NEW (symlink) | `.agent/skills/strict-scope` → `reference/skills/strict-scope` |
| NEW (symlink) | `.agent/skills/token-optimization` → `reference/skills/token-optimization` |
| NEW (symlink) | `.agent/skills/git-commit-convention` → `reference/skills/git-commit-convention` |
| NEW | `templates/task.template.json` |
| NEW | `templates/checkpoint.template.json` |
| NEW | `templates/plan-output.template.json` |
| NEW | `templates/archive-entry.template.json` |

## What to Do

### 1. Symlink generic skills

Dùng junction (cross-platform):
```javascript
// Cách tạo: symlinkSync(resolve(source), resolve(target), 'junction')
// Linux: junction type ignored → tạo symlink bình thường
// Windows: tạo Junction (không cần admin)
```

Link 3 skills từ `reference/skills/` → `.agent/skills/`:
- `strict-scope`
- `token-optimization`
- `git-commit-convention`

### 2. JSON Templates

Tạo 4 template files trong `templates/`:

**`task.template.json`** — Format đã finalize trong plan v0.4 Section 8.1

**`checkpoint.template.json`**:
```jsonc
{
  "version": 1,
  "timestamp": "ISO-8601",
  "server_uptime_ms": 0,
  "queue": {
    "total": 0,
    "pending": 0,
    "active": 0,
    "done": 0,
    "blocked": 0,
    "failed": 0
  },
  "workers": {},
  "last_completed_task": null,
  "dag_state": {}
}
```

**`plan-output.template.json`**:
```jsonc
{
  "plan_source": "plan/xxx.md",
  "decomposed_at": "ISO-8601",
  "decomposed_by": "worker_id",
  "total_tasks": 0,
  "tasks": [],
  "execution_graph": { "groups": [] },
  "reasoning": "..."
}
```

**`archive-entry.template.json`**:
```jsonc
{
  "task_id": "",
  "title": "",
  "status": "done",
  "started_at": "ISO-8601",
  "completed_at": "ISO-8601",
  "duration_ms": 0,
  "worker_id": "",
  "summary": "",
  "files_modified": []
}
```

## Constraints

- Symlinks dùng `junction` type (cross-platform)
- Templates phải valid JSON (không để comments trong actual files — chỉ ở plan)
- Template values dùng placeholder strings, không dùng actual values

## Dependencies

- `07-skills_orchestrator-protocol` phải xong trước (SKILL.md references skills)

## Verification

```bash
# Verify symlinks
ls -la .agent/skills/

# Verify templates
node -e "JSON.parse(require('fs').readFileSync('templates/task.template.json','utf8')); console.log('OK')"
```

## Done Criteria

- [ ] 3 symlinks tồn tại, trỏ đúng target
- [ ] Symlinks hoạt động trên current OS (đọc được file qua symlink)
- [ ] 4 template JSON files valid
- [ ] Templates match plan v0.4 format
