# Plan: Workspace Memory Pipeline v3

> **Created**: 2026-04-20  
> **Updated**: 2026-05-02 (v3 - token-efficient, relation-aware, server-assisted)  
> **Status**: Approved design, needs task refresh  
> **Supersedes**: `plan_local-rag-gitnaxus-obsidian.md` (archived)  
> **Depends on**: `plan_evolution-and-local-brain.md` Phase 2  
> **Goal**: Give a new coding agent useful workspace memory without forcing it to rediscover the repo every session.

---

## 0. Research Summary: 2026 Direction

Modern agent memory is no longer "dump all context into prompt". The best systems use **context engineering**: keep a small always-loaded memory, put detail outside context, and let the agent update or retrieve detail only when needed.

Important boundary: this is **not** a plan where the agent manually handles the whole scan. The **server is the memory pipeline owner** for scanning, normalizing, indexing, deduping, compacting, and enforcing token budgets. The agent consumes the memory, asks the server for lookups, and proposes durable learnings through tools.

Signals checked on 2026-05-02:

| System | Current pattern | What matters for us |
|--------|-----------------|---------------------|
| Claude Code memory | `CLAUDE.md` + auto memory. First 200 lines / 25KB of `MEMORY.md` load at start; topic files are read on demand. | Do not make one giant workspace-memory file. Use a small index plus topic files. |
| Cursor rules | Project rules in `.cursor/rules`, scoped by type/globs; memories become reusable rules. | Add path/topic scoping so irrelevant memory is not injected. |
| LangChain Deep Agents | Filesystem-backed memory, skills as procedural memory, startup or on-demand retrieval, writable or read-only memory, background consolidation. | File-backed memory is valid and modern if it is compacted and scoped. |
| LangGraph store | Long-term memory as JSON docs under namespace/key; tools read/write through runtime store. | Use stable IDs, namespaces, and machine-readable metadata, not only prose. |
| OpenAI Agents SDK | Sessions persist conversation items and can compact Responses history. | Session memory is separate from workspace memory; use compaction for episodic logs, not as project knowledge. |
| Letta/MemGPT | Core memory in context + archival memory outside context + agent-editable memory blocks. | Keep a small "core" memory and separate large archival/detail memory. |
| Mem0 | Ingest messages/facts, extract useful memories, conflict resolution, vector/optional graph storage, metadata. | `update_memory` must dedupe/merge/supersede, not append blindly. |
| Zep | Temporal knowledge graph with facts, entities, episodes, valid/invalid time and engineered context string. | Relationships and stale facts need timestamps, confidence, and invalidation. |

**Conclusion:** v2 was right to remove heavy external dependencies, but incomplete because it still treats `.agent/workspace-memory.md` as the whole memory. v3 keeps zero external dependencies, but adopts the same shape as leading systems: small core index, topic files, relation index, write tools, dedupe, and compaction.

### Responsibility Model

| Owner | Responsibility | Not responsible for |
|-------|----------------|---------------------|
| Server | Scan workspace, parse configs/imports/git, build `manifest.json`, build `relations.json`, regenerate startup kernel, compact stale/duplicate memory, enforce budgets. | Deciding task intent or reading arbitrary source files during a coding task. |
| Agent | Read startup kernel, call `memory_lookup`, inspect narrowed source files, call `update_memory` when it learns a durable fact/decision/pitfall. | Manually crawling the whole repo, maintaining hashes, deduping every memory entry by hand. |
| Human | Curate project rules, approve architecture direction, review memory when needed. | Re-explaining stable repo context every session. |

---

## 1. Direct Answers

### 1.1 Scan như thế nào?

Use a **layered scanner**, not a single file tree dump.

| Scan source | What to extract | Pros | Cons | Keep in v3? |
|-------------|-----------------|------|------|-------------|
| Filesystem tree | top-level folders, important files, size, mtime | fast, zero deps | low semantic quality | yes |
| Package/config files | scripts, entry points, module type, tsconfig paths | high signal | ecosystem-specific | yes |
| Static imports | dependency edges, module ownership | good for "touch X -> inspect Y" | regex import parsing misses dynamic/aliased imports | yes, improve later with TS compiler API |
| Git co-change | files that historically changed together | finds hidden coupling | noisy from generated/tmp files, rename noise | yes, with filters and evidence |
| Git hot files | unstable/high-activity files | good risk signal | can overfit to recent work | yes |
| Tests/tasks/docs | "test_of", workflow, task domain links | great for coding agents | requires conventions | yes |
| Agent learnings | corrections, pitfalls, repo-specific tricks | high ROI | can become stale/duplicated | yes, with schema and compaction |
| Runtime/session logs | failures, successful fix paths | useful episodic memory | noisy and token-heavy | only summarized |
| Embeddings/vector search | semantic lookup over many chunks | good for large repos/docs | external deps/cost/staleness | future only |
| Knowledge graph | typed relations and temporal facts | best for relation-heavy systems | complex to build well | lightweight local relation index now; full graph later |

For a project with many related files, memory should not say "read these 500 files". It should say:

```markdown
## Relation Cards

### task lifecycle
- Owns: `src/mcp-server/state-manager.ts`, `src/mcp-server/task-queue.ts`
- Touch together:
  - `src/mcp-server/tools.ts` <-> `src/mcp-server/state-manager.ts`
    - kind: api_contract + co_change
    - evidence: imports, 6 co-changes
    - when touching: task creation, completion, worker assignment
    - also inspect: `src/models/task.ts`, `src/constants.ts`
- Test with: `tests/e2e-flow.ts`, `tests/test-check-plans.ts`
```

And the machine-readable equivalent:

```json
{
  "id": "rel.task-lifecycle.tools-state",
  "kind": ["api_contract", "co_change"],
  "paths": [
    "src/mcp-server/tools.ts",
    "src/mcp-server/state-manager.ts"
  ],
  "summary": "Tool handlers call state-manager APIs for task lifecycle changes.",
  "whenToUse": ["changing task creation", "changing completion", "worker assignment"],
  "alsoInspect": ["src/models/task.ts", "src/constants.ts"],
  "evidence": {
    "imports": true,
    "coChanges": 6,
    "lastSeen": "2026-05-02"
  },
  "confidence": 0.86
}
```

This lets a new agent jump from task intent -> relation card -> exact files, instead of rediscovering the dependency graph.

### 1.2 Lưu như thế nào?

Do **hybrid local storage**:

| Storage | Use for | Pros | Cons |
|---------|---------|------|------|
| `.agent/workspace-memory.md` | small startup index only | readable, portable, always available | expensive if it grows |
| `.agent/memory/topics/*.md` | detailed domain notes | readable, editable, on-demand | needs index discipline |
| `.agent/memory/relations.json` | typed file/module relationships | cheap to query, dedupe-friendly | less human friendly |
| `.agent/memory/manifest.json` | hashes, scan timestamps, budgets | enables incremental scan | bookkeeping |
| `.agent/memory/episodes/*.md` | compacted session outcomes | good "how we solved X" memory | must be aggressively summarized |
| SQLite/FTS | optional local search | fast, still local | more moving parts |
| Vector DB / graph DB | future large repo mode | best semantic/graph retrieval | dependencies and maintenance |

`update_memory` should become an edit API, not append-only.

```typescript
type MemoryKind = 'fact' | 'decision' | 'pitfall' | 'workflow' | 'relation' | 'episode';
type MemoryAction = 'add' | 'replace' | 'merge' | 'supersede' | 'delete';

interface UpdateMemoryInput {
  action: MemoryAction;
  kind: MemoryKind;
  content: string;
  topic?: string;
  paths?: string[];
  source?: string;
  replaces?: string;
  confidence?: number;
  ttlDays?: number;
}
```

Rules:

- `add`: create a new typed entry only if no near-duplicate exists.
- `merge`: combine similar entries and preserve evidence.
- `replace`: exact edit by ID.
- `supersede`: keep old entry but mark `validUntil`.
- `delete`: remove wrong memory with audit trail.

Read path:

1. Session start reads only `.agent/workspace-memory.md`.
2. If task mentions a topic/path, call `memory_lookup({ path | topic | query })`.
3. `memory_lookup` returns a compact bundle: relevant relation cards, topic file pointers, and at most N lines of detail.
4. Agent reads source files only after relation memory narrows the target.

### 1.3 Làm thế nào ít tốn token nhất?

Token budget must be a product requirement:

| Layer | Budget | Rule |
|-------|--------|------|
| Startup memory | <= 12KB, target <= 200 lines | Always loaded |
| Relation cards in startup | top 20 only | Put rest in `relations.json` |
| File map | top modules, not every file | Full map lives in `manifest.json` |
| Agent learnings | top active learnings only | Old/stale notes compact into topic files |
| Task retrieval | <= 4KB per lookup | Return pointers before prose |
| Episode memory | one paragraph per solved task | Never store full transcript |

Practical techniques:

- Replace full file table with **module cards** and exact "also inspect" pointers.
- Store detail in topic files and load on demand.
- Use stable IDs so future memory can say `see rel.task-lifecycle.tools-state`.
- Compact learnings when `.agent/workspace-memory.md` exceeds 12KB or 200 lines.
- Deduplicate before writing. Contradictions should supersede old entries, not sit beside them.
- Keep procedural memory in `.agent/skills/` and `.agent/workflows/`, loaded by relevance only.
- Keep session history/checkpoints outside workspace memory; summarize only final lessons.
- Prefer exact path/topic lookup over semantic search until the repo becomes too large.

---

## 2. v3 Architecture

```text
Workspace
  .agent/
    workspace-memory.md              # small boot index, always read
    memory/
      manifest.json                  # hashes, scan state, module map
      relations.json                 # typed relation cards
      topics/
        architecture.md              # on-demand
        commands.md
        pitfalls.md
        task-lifecycle.md
        testing.md
      episodes/
        2026-05-02-wm08.md           # compact task outcome, optional
    skills/                          # procedural memory, on-demand
    workflows/                       # procedural memory, on-demand
  GEMINI.md                          # instruction: read boot index first
```

The server remains a local memory pipeline: scanner, normalizer, relation builder, compactor, and budget enforcer. Intelligence still lives in workspace files, but the agent is not expected to perform raw scan/index work itself.

```text
scan_workspace
  -> scan files/config/git/tasks
  -> update manifest.json incrementally
  -> update relations.json
  -> regenerate workspace-memory.md boot index
  -> preserve and compact agent-provided memories

update_memory
  -> typed add/merge/replace/supersede/delete
  -> server dedupes, validates metadata, and writes the right storage file
  -> writes topic files and/or relations.json
  -> updates boot index only for high-signal memories

memory_lookup
  -> query by path/topic/free text
  -> returns compact pointers + relation cards
```

---

## 3. Output Contract

### 3.1 `.agent/workspace-memory.md`

This file is the **startup kernel**, not the full memory.

```markdown
# Workspace Memory - {project}
> Last generated: {timestamp}
> Budget: startup <= 12KB / <= 200 lines
> Detail lives in `.agent/memory/`

## Read Me First
- If touching task lifecycle, read topic `task-lifecycle` and relation `rel.task-lifecycle.tools-state`.
- If changing prompts, read topic `agent-prompts`.
- If changing scan_workspace, read topic `workspace-memory`.

## Project Overview
- Name: {name}
- Stack: {stack}
- Entry points: {entry_points}
- Build/test: {commands}

## Module Cards
### MCP server
- Owns: server, tools, transport, state, queue
- Key paths: `src/mcp-server/tools.ts`, `src/mcp-server/state-manager.ts`
- Related topic: `.agent/memory/topics/task-lifecycle.md`

## Top Relations
- `rel.task-lifecycle.tools-state`: `tools.ts` <-> `state-manager.ts`
  - use when: task creation/completion/assignment
  - also inspect: `src/models/task.ts`, `src/constants.ts`

## Active Learnings
- [mem.build.clean-dist] Build failures often come from stale `dist`; clean before verify. Source: WM08.

## Memory Index
- `topics/architecture.md`: architecture decisions and module responsibilities
- `topics/testing.md`: known test commands, env, flakes
- `relations.json`: full typed relation index
- `manifest.json`: scan metadata and file/module map
```

### 3.2 `relations.json`

Relations should be typed and queryable.

```typescript
interface RelationCard {
  id: string;
  kind: Array<'imports' | 'co_change' | 'test_of' | 'api_contract' | 'workflow' | 'configures' | 'generates'>;
  paths: string[];
  summary: string;
  whenToUse: string[];
  alsoInspect: string[];
  evidence: {
    imports?: boolean;
    coChanges?: number;
    tests?: string[];
    docs?: string[];
    tasks?: string[];
    lastSeen: string;
  };
  confidence: number;
  validFrom: string;
  validUntil?: string;
}
```

### 3.3 `manifest.json`

Use this to avoid full rescans.

```typescript
interface MemoryManifest {
  version: 3;
  generatedAt: string;
  gitHead?: string;
  files: Record<string, {
    sha1: string;
    mtimeMs: number;
    size: number;
    type: string;
    module?: string;
  }>;
  budgets: {
    startupMaxBytes: 12288;
    startupMaxLines: 200;
    lookupMaxBytes: 4096;
  };
}
```

---

## 4. Tool Contracts

### 4.1 `scan_workspace`

```typescript
{
  name: "scan_workspace",
  inputSchema: z.object({
    force_update: z.boolean().optional().default(false),
    mode: z.enum(["fast", "full"]).optional().default("fast"),
  }),
}
```

Behavior:

- `fast`: compare `manifest.json` with file hashes/mtimes and only rescan changed files.
- `full`: rebuild file map, import edges, co-change patterns, hot files, topic summaries.
- Always preserve agent-managed memories.
- Always regenerate the startup kernel under budget.
- Return `budgetStatus`, `changedFiles`, `relationsUpdated`, and `memoryPath`.

### 4.2 `update_memory`

```typescript
{
  name: "update_memory",
  description: "Create, edit, merge, or invalidate durable workspace memory.",
  inputSchema: z.object({
    action: z.enum(["add", "replace", "merge", "supersede", "delete"]).default("add"),
    kind: z.enum(["fact", "decision", "pitfall", "workflow", "relation", "episode"]),
    content: z.string(),
    topic: z.string().optional(),
    paths: z.array(z.string()).optional(),
    source: z.string().optional(),
    replaces: z.string().optional(),
    confidence: z.number().min(0).max(1).optional().default(0.7),
    ttl_days: z.number().int().positive().optional(),
  })
}
```

Behavior:

- Normalize content into a stable memory ID.
- Detect duplicate/similar entries in the same topic.
- For contradictions, ask for `supersede` or auto-supersede when `replaces` is provided.
- Store high-signal active memories in boot index; store detail in topic file.
- Return `{ status, id, location, changedFiles }`.

### 4.3 `memory_lookup`

```typescript
{
  name: "memory_lookup",
  description: "Retrieve compact workspace memory by path, topic, relation id, or query.",
  inputSchema: z.object({
    path: z.string().optional(),
    topic: z.string().optional(),
    relation_id: z.string().optional(),
    query: z.string().optional(),
    max_bytes: z.number().int().positive().optional().default(4096),
  })
}
```

Behavior:

- Query `relations.json`, `manifest.json`, and topic headings.
- Return compact result first: IDs, summaries, paths, next files to inspect.
- Include source file pointers instead of large prose whenever possible.

---

## 5. Scanner Implementation Notes

### 5.1 File scanner

Current `src/mcp-server/tools/scan-workspace.ts` scans up to 500 files and emits a giant file map. v3 should extract scanner code into `src/services/rag/` as already planned, but change the output priority:

1. Detect modules/folders.
2. Emit only top module cards into startup memory.
3. Put full file metadata in `manifest.json`.
4. Ignore generated/noisy paths for both scan and git co-change: `dist`, `coverage`, `.tmp`, `exchange`, lockfile-only changes, generated docs when possible.

### 5.2 Dependency scanner

Start with regex import parsing, but normalize relative imports to real workspace paths. Later, upgrade to TypeScript compiler API if aliases/dynamic imports become important.

Relation kinds to infer:

- `imports`: direct import edge.
- `test_of`: test file targets source file by name/import.
- `configures`: config file affects source/tool.
- `generates`: script produces output.
- `api_contract`: tool/schema/model boundary.
- `workflow`: `.agent/workflows` or task docs reference source paths.
- `co_change`: git history supports coupling.

### 5.3 Git scanner

Co-change is useful but noisy. Rules:

- Exclude commits with too many changed files.
- Exclude generated/tmp paths.
- Track `lastTogether`.
- Require minimum count or supporting evidence before showing in startup.
- Store lower-confidence relations in `relations.json` only.

### 5.4 Memory compactor

Run when:

- startup memory > 12KB or > 200 lines
- active learnings > 25
- duplicate rate detected
- memory has stale entries older than `ttl_days`

Compaction output:

- keep the latest true fact
- move detail to topic files
- mark superseded facts with date/evidence
- keep audit trail short

---

## 6. Lifecycle

```text
Agent session start
  -> Read `.agent/workspace-memory.md`
  -> If missing/stale, call `scan_workspace({ mode: "fast" })`
  -> Use Memory Index to decide which topic/relation to lookup

During task
  -> Use `memory_lookup` for topic/path/relation
  -> Inspect narrowed source files
  -> If a reusable lesson is discovered, call `update_memory`

After task
  -> Save only durable facts, decisions, pitfalls, relation updates, or compact episode summary
  -> Do not store full chat transcript in workspace memory

Periodic
  -> `scan_workspace({ mode: "full" })`
  -> compact memory if over budget
```

---

## 7. Recommended Enhancement Over v2

| Priority | Change | Why |
|----------|--------|-----|
| P0 | Change `.agent/workspace-memory.md` to startup kernel only | biggest token win |
| P0 | Add `.agent/memory/manifest.json` | enables incremental scan |
| P0 | Add `.agent/memory/relations.json` | makes relation-heavy projects readable without rediscovery |
| P0 | Upgrade `update_memory` from append-only to typed edit API | prevents stale duplicate memory |
| P1 | Add `memory_lookup` tool | lets agent recall only what it needs |
| P1 | Add memory compaction budget | prevents memory rot |
| P1 | Filter noisy git co-change paths | improves relation quality |
| P2 | Optional SQLite FTS search | useful if topic files grow |
| Future | Optional vector/graph backend behind same API | only when repo/docs exceed local file strategy |

Do **not** add vector DB or full graph DB now. The repo is small enough for local files plus typed JSON. The design should leave an interface for future search backends, but not pay that cost yet.

---

## 8. Task Breakdown

| Task | Description | Priority |
|------|-------------|----------|
| WM01 | Scaffold `src/services/rag/` modules | P0 |
| WM02 | Refactor scanner into file scanner + manifest writer | P0 |
| WM03 | Build git/import relation analyzer with noise filters | P0 |
| WM04 | Generate startup kernel + topic files + `relations.json` | P0 |
| WM05 | Update `scan_workspace` to v3 fast/full modes | P0 |
| WM06 | Implement `update_memory` typed edit API | P0 |
| WM07 | Implement `memory_lookup` | P1 |
| WM08 | Add compaction + budget enforcement tests | P1 |
| WM09 | Update prompts/GEMINI to read startup kernel and use lookup | P1 |
| WM10 | E2E verify: scan -> lookup -> update -> rescan -> compact | P1 |

---

## 9. Acceptance Criteria

- New agent reads at most `.agent/workspace-memory.md` at startup.
- Startup memory is under 12KB and under 200 lines.
- Relation-heavy areas are expressed as relation cards with `alsoInspect`.
- Full file map no longer lives in startup memory.
- `update_memory` can add, merge, replace, supersede, and delete.
- Duplicate memory does not accumulate after repeated tasks.
- Re-scan preserves agent-managed memory.
- Fast scan only reprocesses changed files using `manifest.json`.
- `memory_lookup({ path })` returns relevant relations and topic pointers under 4KB.
- No external service is required.

---

## 10. Why This Is Less Likely To Become Outdated

This plan copies the durable pattern, not any single vendor implementation:

- small core memory
- external/detail memory
- explicit read/write tools
- scoped retrieval
- typed metadata
- dedupe and invalidation
- compaction
- optional future search backend

That shape is shared across file-based coding agents, stateful agent runtimes, vector memory systems, and temporal graph memory systems. The storage can evolve later without changing how agents think: read small index, lookup relevant detail, update durable learning.

---

## 11. References

- Claude Code memory: https://code.claude.com/docs/en/memory
- Cursor rules: https://docs.cursor.com/context/rules
- LangChain Deep Agents memory: https://docs.langchain.com/oss/javascript/deepagents/memory
- LangChain long-term memory store: https://docs.langchain.com/oss/javascript/langchain/long-term-memory
- OpenAI Agents SDK sessions: https://openai.github.io/openai-agents-js/guides/sessions/
- Letta stateful agents and archival memory: https://docs.letta.com/guides/core-concepts/stateful-agents, https://docs.letta.com/guides/ade/archival-memory
- Mem0 add memory: https://docs.mem0.ai/core-concepts/memory-operations/add
- Zep memory and temporal graph: https://help.getzep.com/v2/memory, https://help.getzep.com/v2/concepts
