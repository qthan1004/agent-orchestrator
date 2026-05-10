# Task P2-34: Workspace Code Search Engine (Standalone Lib)

## Info
- **ID:** P2-34-workspace-code-search
- **Repo:** `~/workspace/code-search-engine` (NEW — standalone package)
- **Group:** Post-Core Intelligence
- **Dependencies:** None (standalone — orchestrator integrates later)
- **Priority:** 19
- **Ref:** `dev-docs/2026-05-08_research_cocoindex-analysis.md`
- **Inspired by:** [cocoindex-code](https://github.com/cocoindex-io/cocoindex-code) — rewritten in TypeScript, zero Python dependency

## Constraints (Always-on Skills)

> These rules are **non-negotiable**. Violating any = task rejection.

- **strict-scope**: Do ONLY what this task specifies. No extra refactoring, tests, or improvements.
- **safe-deletion**: NEVER delete files without explicit user permission.
- **folder-convention**: This is a standalone lib — follows its own structure.

## Background

CocoIndex-Code (Python/Rust) provides AST-based semantic code search that reduces agent token usage by ~70%. However, adding a Python runtime to a Node.js project creates unnecessary complexity. This task reimplements the core idea as a **standalone TypeScript library** — independently testable, benchmarkable, and reusable across projects.

## Why standalone?

| Aspect | Embedded in orchestrator | Standalone lib ✅ |
|--------|-------------------------|-------------------|
| **Testing** | Coupled to orchestrator runtime | Independent test suite |
| **Evaluation** | Hard to benchmark | Can compare directly vs cocoindex-code |
| **Reuse** | Locked to 1 project | Any Node.js project can use |
| **Dev speed** | Blocked by orchestrator tasks | Develop in parallel |
| **Publish** | N/A | npm publishable |

## What to do

### Phase A: Standalone library setup

```
code-search-engine/
├── src/
│   ├── parser.ts          # AST → semantic chunks
│   ├── indexer.ts          # Incremental indexing (Δ only)
│   ├── search.ts           # Vector similarity search
│   ├── embedder.ts         # Embedding provider interface
│   ├── types.ts            # Shared types
│   └── index.ts            # Public API
├── tests/
│   ├── parser.test.ts
│   ├── indexer.test.ts
│   ├── search.test.ts
│   └── fixtures/           # Sample codebases for testing
├── bin/
│   └── cse.ts              # CLI entry point (optional)
├── package.json
├── tsconfig.json
└── README.md
```

### Architecture:

```
Workspace files
    ↓
AST Parser (tree-sitter) → Code chunks (functions, classes, blocks)
    ↓
Embedder (pluggable: Ollama / OpenAI / local) → Vector embeddings
    ↓
Vector index (hnswlib-node) → Similarity search
    ↓
Returns relevant code chunks with scores
```

### Core Components:

#### 1. `src/types.ts`
```typescript
interface CodeChunk {
  filePath: string;
  symbolName: string;
  symbolType: 'function' | 'class' | 'interface' | 'type' | 'export' | 'block';
  language: string;
  startLine: number;
  endLine: number;
  content: string;
}

interface SearchResult extends CodeChunk {
  score: number;  // similarity 0-1
}

interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
  dimensions: number;
}

interface IndexStats {
  totalFiles: number;
  totalChunks: number;
  changedFiles: number;
  indexedAt: string;
}
```

#### 2. `src/parser.ts`
- Use `tree-sitter` + language grammars (TypeScript, JavaScript, Markdown)
- Parse files into semantic chunks: functions, classes, interfaces, type aliases, exports
- Skip: node_modules, .git, _archive, dist, build
- Configurable ignore patterns (`.cseignore` or config)

#### 3. `src/embedder.ts`
- **Pluggable provider interface** — not locked to Ollama
- Built-in providers:
  - `OllamaEmbedder` — calls local Ollama API
  - `LiteLLMEmbedder` — cloud fallback (OpenAI, etc.)
- Easy to add custom providers

#### 4. `src/indexer.ts`
- **Incremental indexing** (Δ only — key CocoIndex concept):
  - Hash each file (SHA-256)
  - Compare with stored manifest
  - Changed → re-parse → re-embed → upsert
  - Deleted → remove from index
  - Unchanged → skip
- Persist: `.code-search/manifest.json` + `.code-search/index.bin`

#### 5. `src/search.ts`
- Embed query → search vector index → return top-K
- Filter by language, path glob
- Pagination support

#### 6. `src/index.ts` — Public API
```typescript
import { CodeSearchEngine } from 'code-search-engine';

const engine = new CodeSearchEngine({
  workspacePath: '/path/to/project',
  embedder: new OllamaEmbedder({ model: 'nomic-embed-text' }),
  // or: embedder: new OpenAIEmbedder({ apiKey: '...' })
});

await engine.index();                              // incremental
const results = await engine.search('auth logic'); // semantic search
```

#### 7. `bin/cse.ts` — CLI (optional, nice-to-have)
```bash
cse init                              # setup
cse index                             # build/update index
cse search "authentication logic"     # search
cse status                            # index stats
```

### NPM Dependencies:

| Package | Purpose | Size |
|---------|---------|------|
| `tree-sitter` | AST parsing | ~2MB |
| `tree-sitter-typescript` | TS/JS grammar | ~1MB |
| `hnswlib-node` | Vector similarity search | ~500KB |

> **No Python. No Rust. Pure Node.js/TypeScript.**

## Integration with orchestrator (FUTURE — not this task):
```typescript
// In agent-orchestrator, after npm install code-search-engine:
import { CodeSearchEngine } from 'code-search-engine';

// Register as tool for agent workers
tools.register('code-search', async (query) => {
  return engine.search(query, { limit: 5 });
});
```

## Files
| Action | Path |
|--------|------|
| NEW | `~/workspace/code-search-engine/` (entire new repo) |

## Done Criteria
- [ ] Standalone npm package with clean public API
- [ ] AST parsing via tree-sitter (TS/JS files)
- [ ] Pluggable embedding provider interface (Ollama + cloud)
- [ ] Incremental indexing: hash-based Δ detection
- [ ] Semantic search returns relevant code chunks with scores
- [ ] Index persists to disk
- [ ] Test suite with fixture codebases
- [ ] Zero Python/Rust dependencies — pure TypeScript
- [ ] `npm run build` + `npm test` pass
- [ ] README with usage examples

## Evaluation (after done):
- [ ] Benchmark: token count with vs without code search
- [ ] Compare search quality vs `cocoindex-code` (same queries)
- [ ] Measure index time on agent-orchestrator codebase
