# Task P2-31: Domain Auto-Detect

## Info
- **ID:** P2-31-domain-auto-detect
- **Module:** `src/worker/domain-detector.ts` (NEW)
- **Group:** Post-Core Intelligence
- **Dependencies:** P2-01, P2-20, P2-22
- **Priority:** 16
- **Ref:** Bootstrap Protocol Phase A

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Scan the explicitly registered workspace root for manifest files and detect project domain.

Phase 2 scope = manifest-based detection only.

### Architecture rule

- Detection input must be the `workspace_path` already registered with the Orchestrator
- No workspace auto-discovery by worker startup
- Domain detection belongs to workspace/session setup, not ad hoc worker self-discovery

### Detection rules

| Manifest File | Domain Tag |
|---------------|-----------|
| `package.json` with `react` dep | `react-web` |
| `package.json` with `next` dep | `nextjs-web` |
| `package.json` with `express` dep | `node-backend` |
| `package.json` (other) | `node-general` |
| `go.mod` | `golang` |
| `Cargo.toml` | `rust` |
| `pyproject.toml` or `requirements.txt` | `python` |
| `pom.xml` or `build.gradle` | `java` |
| `docker-compose.yml` only | `containerized` |
| Nothing found | `unknown` |

### API

```typescript
interface DomainDetector {
  detect(workspaceRoot: string): Promise<DomainInfo>;
}

interface DomainInfo {
  domain: string;
  confidence: 'high' | 'medium' | 'low';
  manifest: string;
  details?: Record<string, string>;
}
```

### Usage

- Called during workspace/session setup in the Orchestrator flow
- Result is attached to workspace-scoped metadata
- Worker may consume detected domain from assignment payload later

## Files
| Action | Path |
|--------|------|
| NEW | `src/worker/domain-detector.ts` |

## Done Criteria
- [ ] Scans explicit workspace root only
- [ ] No implicit workspace discovery
- [ ] Returns correct domain tag per manifest type
- [ ] Returns `unknown` with `low` confidence when no manifest found
- [ ] Pure function, no side effects
- [ ] `npm run build` pass
