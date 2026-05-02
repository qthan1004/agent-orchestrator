# Task WM08: E2E Verification — Workspace Memory Pipeline

## Info
- **ID:** WM08-e2e-verification
- **Module:** tests/
- **Group:** 5 (Workspace Memory Pipeline)
- **Dependencies:** WM05, WM06, WM07
- **Priority:** 8
- **Ref:** `plan_workspace-memory-pipeline.md` Section 7

## What to do

E2E test toàn bộ pipeline: scan → read → update_memory → re-scan → verify learnings preserved.

### 1. Update existing test
**[MODIFY] `tests/test-scan-workspace.mjs`**

Update to verify new output format:
- Has "## Hot Files" section
- Has "## Architecture Relationships" section  
- Has "## Agent Learnings" section
- Has "## Recent Activity" section

### 2. Create pipeline test
**[NEW] `tests/test-memory-pipeline.ts`**

Test flow:
```
1. scan_workspace(force_update: true) → generates file
2. Verify output has all sections (plan v2 template)
3. update_memory({ content: "test learning", source: "WM08" })
4. Verify learning appended
5. update_memory({ content: "test learning" }) → returns DUPLICATE
6. scan_workspace(force_update: true) → re-generates
7. Verify "test learning" still present (learnings preserved)
8. Clean up test learning
```

### 3. Performance validation
- Measure scan_workspace execution time
- Assert < 12s max (plan target: ~3s typical, 12s max)
- Measure update_memory execution time
- Assert < 100ms

## Files
| Action | Path |
|--------|------|
| MODIFY | `tests/test-scan-workspace.mjs` |
| NEW | `tests/test-memory-pipeline.ts` |

## Done Criteria
- [ ] E2E pipeline test passes
- [ ] Output format matches plan v2 template
- [ ] Learnings preserved across re-scans
- [ ] Dedup works correctly
- [ ] Performance within budget (scan < 12s, update < 100ms)
- [ ] Existing scan workspace test updated and passes
- [ ] `npm run build` passes
