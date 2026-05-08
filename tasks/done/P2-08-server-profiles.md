# Task P2-08: Server Profiles (DEFAULT vs HYBRID)

## Info
- **ID:** P2-08-server-profiles
- **Module:** `src/constants.ts`, `src/config.ts`, `src/utils/startup-prompt.ts`
- **Group:** Sprint 1 (Ollama + Process Management)
- **Dependencies:** P2-00
- **Priority:** 6
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Section 6

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Thêm `SERVER_PROFILES` constant và startup prompt cho profile selection.

### Profiles:
```typescript
export const SERVER_PROFILES = {
  DEFAULT: {
    staleThresholdMs: 30 * 60_000,    // 30 minutes
    autoKillWorker: false,
    workerType: 'IDE' as const,
    maxConcurrentWorkers: 1,
    roleManagement: 'blurred' as const,
  },
  HYBRID: {
    staleThresholdMs: 15_000,         // 15 seconds
    autoKillWorker: true,
    workerType: 'LOCAL_LLM' as const,
    maxConcurrentWorkers: 1,          // 1 for 9B, 2 for 4B
    roleManagement: 'strict' as const,
  }
} as const;
```

### Startup prompt addition:
```
? Server profile (default/hybrid) [default]: _
```

### Config integration:
- `loadConfig()` applies profile-specific values
- Recovery stale threshold uses profile value
- `AppConfig` has `profile: 'default' | 'hybrid'`

## Files
| Action | Path |
|--------|------|
| MODIFY | `src/constants.ts` |
| MODIFY | `src/config.ts` |
| MODIFY | `src/utils/startup-prompt.ts` |

## Verification
```bash
npm run build
# Start server → chọn HYBRID → stale threshold = 15s in health response
```

## Done Criteria
- [x] `SERVER_PROFILES.DEFAULT` và `.HYBRID` defined
- [x] Startup prompt: `? Server profile (default/hybrid)`
- [x] HYBRID mode: staleThreshold=15s, autoKill=true
- [x] DEFAULT mode: unchanged behavior (backward compat)
- [x] `npm run build` pass
