# Task P2-10: TokenCounter

## Info
- **ID:** P2-10-token-counter
- **Module:** `src/worker/token-counter.ts` (NEW)
- **Group:** Sprint 2 (Agent Runner Core)
- **Dependencies:** none
- **Priority:** 8
- **Ref:** `dev-docs/plan_phase2-hybrid-architecture.md` Section 3.3

## What to do

Tạo `TokenCounter` class — track cumulative token usage per worker session.

### API:

```typescript
class TokenCounter {
  constructor(contextLimit: number);
  addUsage(promptTokens: number, completionTokens: number): void;
  shouldCheckpoint(): boolean;  // true if > 80%
  getUsage(): { used: number; limit: number; percentage: number };
  reset(): void;
}
```

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/token-counter.ts` |

## Done Criteria
- [ ] Tracks cumulative tokens correctly
- [ ] `shouldCheckpoint()` true at 80%+
- [ ] `getUsage()` returns structured data
- [ ] `npm run build` pass
