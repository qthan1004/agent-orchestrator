---
description: Scan codebase dependencies using Madge and update the workspace memory map.
---

# Scan Repository

Scan the codebase, analyze modules and circular dependencies, and write a high-value Mermaid graph to `.agent/workspace-memory.md` for agents and users to read.

> **Cross-platform**: Uses Node.js and Madge, works on both Linux and Windows.

## Steps

### 1. Run the codebase generator script
// turbo
```bash
node .agent/tools/generate-memory-map.mjs
```
→ Scans `src/index.ts` using Madge with zero configuration.
→ Resolves TypeScript files and ESM `.js` import paths.
→ Identifies any circular dependencies.
→ Generates Mermaid graphs for high-level folders and core components.
→ Writes/updates the `<!-- START_DEPENDENCY_MAP -->` block in `.agent/workspace-memory.md`.

### 2. Report Output
Report the results to the user:
- Total files processed.
- Number of circular dependencies found.
- Location of the updated `.agent/workspace-memory.md` file.
