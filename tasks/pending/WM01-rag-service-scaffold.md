# Task WM01: RAG Service Directory Scaffold

## Info
- **ID:** WM01-rag-service-scaffold
- **Module:** src/services/rag/
- **Group:** 1 (Workspace Memory Pipeline)
- **Dependencies:** none
- **Priority:** 1
- **Ref:** `plan_workspace-memory-pipeline.md` Section 4

## What to do

Create the `src/services/rag/` directory structure and `index.ts` re-export barrel file.
This is the foundation for all RAG pipeline modules.

### 1. Create directory
**[NEW] `src/services/rag/`**

### 2. Create barrel file
**[NEW] `src/services/rag/index.ts`**

```typescript
// src/services/rag/index.ts
// Re-export all RAG pipeline modules
export { scanFiles } from './file-scanner.js';
export { analyzeGitContext } from './git-context.js';
export { generateMemory, extractLearningsSection } from './memory-generator.js';
```

> **Note:** exports sẽ fail cho đến khi WM02-WM04 implement xong. Task này chỉ scaffold structure.
> Viết barrel file với placeholder exports (comment out nếu cần) — hoặc export empty stubs.

### 3. Approach: Empty stubs
Vì WM02-WM04 chạy parallel (group 1), tạo stub files với type signatures + `throw new Error('Not implemented')`:

- `file-scanner.ts` — stub `scanFiles()`
- `git-context.ts` — stub `analyzeGitContext()`
- `memory-generator.ts` — stub `generateMemory()`, `extractLearningsSection()`

## Files
| Action | Path |
|--------|------|
| NEW | `src/services/rag/index.ts` |
| NEW | `src/services/rag/file-scanner.ts` (stub) |
| NEW | `src/services/rag/git-context.ts` (stub) |
| NEW | `src/services/rag/memory-generator.ts` (stub) |

## Verification
```bash
# 1. TypeScript compiles
npm run build

# 2. Import from barrel works
# (stubs throw but types resolve)
```

## Done Criteria
- [ ] `src/services/rag/` directory exists
- [ ] `index.ts` barrel file re-exports all modules
- [ ] All 3 stub files have correct TypeScript interfaces
- [ ] `npm run build` passes
