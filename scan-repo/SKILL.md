---
name: Codebase Relation Scanning
description: Guidelines on using the local static dependency scanner to maintain and parse the codebase relationship map in workspace-memory.md.
---

# Codebase Relation Scanning

This skill explains how and when to use the lightweight static dependency scan tool to map the codebase relations.

---

## 🚀 When to Use This Skill

As an agent, you should invoke this skill and run `/scan-repo` whenever:
1. **Fresh Context Needed:** You have just started a new coding task and need a high-level understanding of module-to-module dependencies.
2. **Architecture Refactoring:** You are making modifications that alter imports or module boundaries.
3. **Resolving Circular Dependencies:** You are debugging circular import loops or cleaning up boundaries.
4. **Validating Code Changes:** You have finished adding new files and want to ensure the workspace relation map in `.agent/workspace-memory.md` is updated.

---

## 🛠 How it Works

The scan command runs a zero-config local utility utilizing `madge` behind the scenes:
```bash
node .agent/tools/generate-memory-map.mjs
```
This utility:
1. Performs static analysis on typescript source code.
2. Identifies all file relationships and dependencies.
3. Finds circular dependency loops.
4. Outputs/updates the detailed Markdown report with inline Mermaid graphs at the bottom of `.agent/workspace-memory.md`.

---

## 📖 How to Leverage the Relation Map to Prevent Full Scans

> [!TIP]
> Scanning an entire project wastes valuable context tokens and causes latency. Use the relation map in `.agent/workspace-memory.md` to target files efficiently.

### Step-by-Step Context Gathering:
1. **Check Directory Structure First:** Read the high-level `flowchart TD` Mermaid block in `.agent/workspace-memory.md` to see which folders talk to which folders.
2. **Inspect Core Modules flow:** Look at the `flowchart LR` Mermaid block to see how main managers (e.g. `StateManager`, `DispatchLoop`, `RuntimeManager`) connect.
3. **Read Specific File Dependencies:** Open the collapsible `<details>` folder in `.agent/workspace-memory.md` to immediately search for the file you want to edit and see all its parents/dependencies, *without* reading the file contents first.
4. **Zero-in on Candidates:** Only open and view the specific candidate files indicated by the dependency map.
