# Task 04: StateManager — Thêm checkPlansQuick()

## Info
- **ID:** 04-state-manager-plans-quick
- **Module:** mcp-server
- **Group:** 2 (Role Manager)
- **Dependencies:** none
- **Priority:** 1

## What to do

Thêm method `checkPlansQuick()` vào `src/mcp-server/state-manager.mjs` — chỉ kiểm tra file tồn tại, KHÔNG move file (khác `checkPlans()` hiện tại sẽ auto-move pending→processing).

### Implementation
```js
checkPlansQuick() {
  ensureDir(this.config.plans.pending);
  ensureDir(this.config.plans.processing);
  
  const pendingFiles = listFiles(this.config.plans.pending, '.md');
  const processingFiles = listFiles(this.config.plans.processing, '.md');
  
  return {
    hasPending: pendingFiles.length > 0,
    hasProcessing: processingFiles.length > 0,
    pendingCount: pendingFiles.length,
    processingCount: processingFiles.length
  };
}
```

### Thêm method `getProcessingPlan()`
Lấy content của plan đang processing (nếu có) — dùng cho BECOME_PLANNER directive.

```js
getProcessingPlan() {
  const files = listFiles(this.config.plans.processing, '.md');
  if (files.length === 0) return null;
  
  const filename = files[0];
  return {
    current: filename,
    plan_path: `plan/processing/${filename}`,
    content: readFile(path.join(this.config.plans.processing, filename))
  };
}
```

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/mcp-server/state-manager.mjs` |

## Verification
```bash
# Tạo test plan file
mkdir -p plan/pending && echo "# Test Plan" > plan/pending/test-plan.md
node -e "
import { StateManager } from './src/mcp-server/state-manager.mjs';
const sm = new StateManager(null);
console.log(sm.checkPlansQuick());
"
# Expected: { hasPending: true, hasProcessing: false, pendingCount: 1, processingCount: 0 }
# Cleanup: rm plan/pending/test-plan.md
```

## Done Criteria
- [ ] `checkPlansQuick()` trả đúng counts mà KHÔNG move files
- [ ] `getProcessingPlan()` trả content nếu có, null nếu không
- [ ] `checkPlans()` existing không bị ảnh hưởng
