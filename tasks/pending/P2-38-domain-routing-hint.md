# Task P2-38: Domain Routing Hint

## Info
- **ID:** P2-38-domain-routing-hint
- **Module:** domain routing hint, tool/skill bundle selection
- **Group:** Architecture Alignment
- **Dependencies:** P2-33, P2-36, P2-37
- **Priority:** 6
- **Ref:** `dev-docs/2026-05-21_plan_pure-orchestrator-doctrine-registry-harness.md`

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: Source code in src/. Dev docs in dev-docs/. Tasks in tasks/. Never mix product and dev folders.

## What to do

Create a shallow domain routing hint for the explicitly registered workspace.

This is NOT intelligence. It must not infer task strategy, read private data for meaning, or make the server understand workspace content.

Phase 2 scope = shallow signals only.

### Architecture rule

- Input must be the explicit registered `workspace_path`
- No implicit workspace discovery
- No server-side content analysis
- Output is a routing hint for selecting tool/skill bundles
- Low confidence must hand off to Planner/Human instead of guessing

### Detection rules

Allowed evidence:

- file extensions
- manifest filenames
- folder names
- explicit workspace metadata under `.orchestrator`

Forbidden evidence:

- reading spreadsheet/document/code content for meaning
- copying private workspace content into server registry
- choosing a task strategy
- creating tasks
- updating skills/context automatically

Example tags:

| Shallow Signal | Domain Tags | Recommended Bundle |
|----------------|-------------|--------------------|
| `package.json`, `tsconfig.json` | `code`, `typescript` | `code-typescript` |
| `*.xlsx`, `*.xls` | `spreadsheet` | `spreadsheet-basic` |
| `*.csv` | `data-files` | `data-basic` |
| `*.pdf`, `*.md`, `*.docx` | `documents` | `document-basic` |
| Mixed files, weak signal | `generic-files` | `generic-file` |
| Nothing useful | `unknown` | `generic-file` + Planner/Human handoff |

### API

```typescript
interface DomainDetector {
  detect(workspaceRoot: string): Promise<DomainRoutingHint>;
}

interface DomainRoutingHint {
  domain_tags: string[];
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
  recommended_tool_bundle: string;
  needs_planner_decision: boolean;
}
```

### Usage

- Called after workspace registration or by Harness setup
- Result may be written as workspace-local metadata under `.orchestrator`
- Server must not use this to understand task meaning
- Harness may use the recommended bundle only when confidence is high enough
- If `needs_planner_decision = true`, Planner/Human must choose or refine the bundle

## Files
| Action | Path |
|--------|------|
| NEW/MODIFY | domain routing hint module |
| MODIFY | harness/tool bundle selection only if needed |

## Done Criteria
- [ ] Reads shallow signals only
- [ ] Does not read private file contents for meaning
- [ ] Returns domain tags, confidence, evidence, recommended bundle
- [ ] Low confidence returns `generic-file` and `needs_planner_decision: true`
- [ ] Supports non-code workspace signals such as spreadsheets, CSV, and documents
- [ ] Does not update skills/context automatically
- [ ] `npm run build` pass
