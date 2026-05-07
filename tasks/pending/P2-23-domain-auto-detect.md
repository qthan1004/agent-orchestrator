# Task P2-23: Domain Auto-Detect

## Info
- **ID:** P2-23-domain-auto-detect
- **Module:** `src/worker/domain-detector.ts` (NEW)
- **Group:** Sprint 4 (Polish + Intelligence)
- **Dependencies:** P2-01
- **Priority:** 12
- **Ref:** `dev-docs/2026-05-07_plan_phase2-revised-with-research-insights.md`, `dev-docs/2026-05-07_research_planner-intelligence-domain-adaptation-cold-start.md` (Bootstrap Protocol Phase A)

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Scan workspace root for manifest files and detect project domain. Phase 2 = Tier 1 only (manifest detection).

### Detection rules:

| Manifest File | Domain Tag |
|---------------|-----------|
| `package.json` with "react" dep | `react-web` |
| `package.json` with "next" dep | `nextjs-web` |
| `package.json` with "express" dep | `node-backend` |
| `package.json` (other) | `node-general` |
| `go.mod` | `golang` |
| `Cargo.toml` | `rust` |
| `pyproject.toml` or `requirements.txt` | `python` |
| `pom.xml` or `build.gradle` | `java` |
| `docker-compose.yml` only | `containerized` |
| Nothing found | `unknown` |

### API:
```typescript
interface DomainDetector {
  detect(workspaceRoot: string): Promise<DomainInfo>;
}

interface DomainInfo {
  domain: string;       // e.g., 'node-backend'
  confidence: 'high' | 'medium' | 'low';
  manifest: string;     // e.g., 'package.json'
  details?: Record<string, string>; // e.g., { framework: 'express', language: 'typescript' }
}
```

### Usage:
- Called by AgentRunner at startup → domain tag included in reflection metadata
- Called by P2-22 (Case Bank) to tag reflections with domain
- Future: used by Planner to load domain-specific profiles

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/domain-detector.ts` |

## Done Criteria
- [ ] Scans workspace root for manifest files
- [ ] Returns correct domain tag for each manifest type
- [ ] Returns `unknown` with `low` confidence when no manifest found
- [ ] Pure function, no side effects
- [ ] `npm run build` pass
