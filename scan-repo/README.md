# 🔍 Codebase Relation Scanner & Memory Map Generator (Standalone Tool)

A lightweight, zero-configuration static dependency scanner that analyzes import relations in TypeScript / JavaScript (ESM) codebases, identifies circular dependencies, generates beautiful interactive HTML charts, and maintains a persistent Markdown map for AI coding agents.

---

## 📦 What's Inside This Folder

1. **`generate-memory-map.mjs`**: The core scanner engine. It runs `madge` behind the scenes, parses ESM/TS import paths, detects circular loops, builds high-quality Mermaid dependency graphs, and generates interactive D3/SVG flowcharts.
2. **`SKILL.md`**: Guide for AI agents explaining how to use the relation map efficiently without wasting prompt tokens on full codebase scans.
3. **`scan-repo.md`**: The structured runner workflow definition for triggering scans.

---

## 🚀 How to Setup in Any Other Project

You can drop this standalone tool into **any** Node.js / TypeScript project in less than a minute!

### Step 1: Install Dependencies
Make sure you have `madge` installed globally or locally in your target repository:
```bash
npm install --save-dev madge
```
*(Optionally install `npx` if not already installed, as the script invokes `npx madge` under the hood).*

### Step 2: Copy Files
Move the files from this folder into your project structure. Recommended layout:
```
your-repo/
├── .agent/
│   ├── tools/
│   │   └── generate-memory-map.mjs    <-- Put the scanner script here
│   ├── skills/
│   │   └── scan-repo/
│   │       └── SKILL.md               <-- Put the skill guide here
│   ├── workflows/
│   │   └── scan-repo.md               <-- Put the workflow guide here
│   └── workspace-memory.md            <-- Target file to be automatically updated!
```

### Step 3: Run the Scanner
From the root of your project, run:
```bash
node .agent/tools/generate-memory-map.mjs
```

---

## ✨ Features You Get

* 📈 **Mermaid Flowcharts**: Generates structural overview diagrams of folder relations and manager architectures.
* 🔄 **Circular Dependency Alerts**: Instantly flags circular references with a strict loop breakdown so you can fix them early.
* 🌐 **Interactive HTML Map**: Generates an interactive visualization at `.agent/codebase-map.html` with click-to-collapse, search, filter, and zoom capabilities!
* 🤖 **AI-Agent Context Injection**: Seamlessly updates/injects the dependency map into `.agent/workspace-memory.md` so that LLMs, Cursor, Aider, or Gemini-Agent can understand the entire project at a glance without reading all files.
