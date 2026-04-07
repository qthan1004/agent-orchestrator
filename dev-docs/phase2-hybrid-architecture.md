# Phase 2: Hybrid Agentic Architecture & Local Worker Integration

> **Tags:** `features`, `architecture`, `phase-2`, `local-llm`
> **Date:** 2026-04-07
> **Status:** Ideation / Proposed

## 1. Architectural Vision: Unidirectional Data Flow

Phase 2 proposes a paradigm shift from conventional Peer-to-Peer (P2P) agent structures to a highly controlled, biological-inspired **Unidirectional Data Flow** architecture. 

*   **The Head (Planner / IDE / Antigravity):** Represents cognitive intelligence. Responsible for interpreting requirements, generating strategies, executing system architecture design, and creating actionable task decompositions. The Head is the sole entity allowed to ideate and discuss solutions with the human operator.
*   **The Body (Orchestrator Server):** Represents the central nervous system. Responsible for tracking state, scheduling tasks via a file-based queue, managing hardware resources (VRAM/RAM), and enforcing security boundaries.
*   **The Limbs (Local Model Workers):** Represents mechanical execution. Workers are entirely stateless entities constrained to execute a single atomic task. They ingest explicit instructions, utilize strictly provisioned tools, and report results back to the Body via MCP.

**Data Flow Policy:** Strict Top-Down (Head -> Body -> Limbs). Limbs cannot communicate directly with the Head or each other, avoiding hallucination echo-chambers and preserving systemic consistency. 

---

## 2. Pain Points Resolved

The Phase 2 architecture directly addresses critical pain points observed in early Orchestrator development and standard Agent frameworks:

1.  **Out-of-Distribution (OOD) Agent Limitations:** Agents often fail to construct novel architectures, defaulting to generic patterns present in their training data. Phase 2 keeps high-level design within the Human-IDE loop (Head) to guarantee bespoke solutions.
2.  **Context Leakage & Hallucination Echo-chambers:** P2P agents cross-contaminate their context windows after prolonged interactions.
3.  **Local Hardware Exhaustion (OOM):** Persistent Local LLMs on personal machines crash under sustained long-context operations.
4.  **Security Risk of Autonomous Execution:** Worker agents with unrestrained tool access are prone to execute destructive actions when hallucinating.

---

## 3. Core Features & Mechanisms

### 3.1. Ephemeral & Sandboxed Workers
Workers are designed as single-use (ephemeral) instances.
*   **Mechanism:** Upon retrieving a task from `exchange/`, the worker executes the steps, calls the `complete_task` (or `save_checkpoint`) tool, and is subsequently force-killed by the Server.
*   **Benefit:** Wipes out VRAM bloat and resets the context window exactly at the start of a new task, ensuring 0% context leakage.

### 3.2. File-based IPC (Inter-Process Communication)
The system leverages File-based IPC (reading/writing `.md` and `.json` in the workspace root) rather than persistent WebSockets or in-memory state streams.
*   **Mechanism:** Workers only load the specific file contexts required for an assigned task.
*   **Benefit:** Massively reduces RAM overhead and eliminates the need for maintaining stateful connection layers. Deeply synergizes with the stateless nature of Ephemeral Workers.

### 3.3. Context Window Checkpointing (Server-Driven Preemption)
To accommodate limited model context lengths natively available on personal hardware:
*   **Mechanism:** The Orchestrator Server mounts a resource monitor. When a Worker's token utilization exceeds the safe threshold (e.g., 80-85%), the Server enforces a hard interrupt (Out-of-Band Preemption). It automatically injects an overriding high-priority System Prompt forcing the Worker to execute a `save_checkpoint` tool call.
*   **Benefit:** The Worker compiles a short "Last Will" summary (completed steps, remaining steps). The Server destroys the exhausted worker and spawns a fresh instance, injecting only the summary as the initial context. This restores the 85% token buffer without losing progress.

### 3.4. Dynamic Tool Provisioning
The Orchestrator Server governs the specific tools provided to the Worker instance dynamically based on the current task's objective.
*   **Mechanism:** A documentation-reading task spawns a Worker restricted to `view_file`. A code-refactoring task spawns a Worker with `write_to_file`.
*   **Benefit:** Absolute containment. Prevents an aberrant local LLM from taking uncontrolled destructive actions on the file system.

### 3.5. Mandatory Changelog Generation for Head Review
To drastically reduce the token consumption required by the Head (Claude) when reviewing completed tasks:
*   **Mechanism:** When the Local Worker finishes execution and calls the `complete_task` tool, it is forcefully required to bundle a concise 'Changelog' (detailing exact files touched, line additions, and logic shifted).
*   **Benefit:** The Head (Claude) does not need to re-read the entire massive codebase to validate a Local Worker's submission. Claude simply reads the localized `Changelog` alongside the source control diff. This allows the Head's tight API quota to stretch across significantly more tasks before exhaustion.

---

## 4. Hardware Considerations & Local Model Selection

### Constraints
The target local environment utilizes an **Nvidia RTX 5060 Ti 16GB VRAM**.
To support up to 2 parallel Local Workers without OOM failure or relying on severe CPU offloading, each Worker must consume `< 7GB VRAM`.

### Recommended "Limb" Models (2026 Standards)
The requirement mandates models boasting excellent JSON format adherence (Function Calling) and strong baseline coding capabilities within the 7B-9B parameter range (Quantized to GGUF Q4_K_M/Q5). Recommended candidates include:

1.  **Qwen 3.5 9B (Instruct/Coder):** Demonstrates unparalleled strictness in Function/Tool Calling and logical structuring. It natively supports up to 262K context windows (which prevents accuracy degradation during middle-context recall) and can effectively execute complex reasoning tasks rapidly.
2.  **Llama 3.2/3.3 8B Instruct:** Highly disciplined in following negative constraints within System Prompts (e.g., stopping when mandated). Sits perfectly in limits required by 2-worker concurrent allocations.
3.  **DeepSeek-Coder V-Series Distilled (7B-8B):** A strong analytical coding alternative, though occasionally less robust at rigid schema-adherence than Qwen.

**Note:** Explicitly avoid running *Reasoning* or *Chain-of-Thought* variants (e.g., DeepThink / R1) for execution Workers, as their invisible logical preamble drastically increases Time-to-First-Token (TTFT) and contradicts the requirement for fast, blind mechanical execution.

---

## 5. Server Operation Profiles (Modes)

To Ensure Backward Compatibility with Phase 1 (where the agent IDE acts as a persistent worker), the Orchestrator Server will define startup profiles to handle timeout logics and role distinctions dynamically:

### Profile 1: Default Mode (Single IDE / Antigravity)
*   **Role Management:** Blurred. The IDE agent acts as both the Planner and Worker, shifting contexts without strict boundaries.
*   **Timeouts:** Extremely forgiving (`STALE_THRESHOLD_MS` = e.g., 30 minutes). Accounts for Human-in-The-Loop delays, typing delays, and long execution thoughts. It will NOT auto-kill the IDE worker if it idles.

### Profile 2: Hybrid Mode (IDE Planner + Local Workers)
*   **Role Management:** Strict separation. The IDE acts ONLY as the Planner (Head). Execution tasks are strictly assigned to Local AI instances (Limbs).
*   **Timeouts:** Ruthless execution constraints (`STALE_THRESHOLD_MS` = e.g., 10-30 seconds). If a local worker disconnects or stalls without reporting via MCP tools, the Server automatically kills it, revokes the task, and requeues it for a fresh worker instance.

---

## 6. Expected Phase 2 Workflow Lifecycle

To maximize quota efficiency and maintain architectural integrity, the system mandates the following cyclical development flow:

1. **Plan Generation:** A `pending plan` is fed to the Head (Claude 4.6 / Antigravity). The Head parses the requirements and decomposes it into explicit task definitions.
2. **Blind Execution:** Local Worker models (e.g., Qwen) are strictly barred from picking tasks. The Orchestrator Server forces tasks down to specific Local Workers sequentially. The Workers write the code and generate the Changelog without broader context.
3. **Phase-Level Review:** Once all autonomous coding within a phase is flagged as complete, the Head evaluates the aggregate codebase per Phase (instead of reviewing each microscopic task individually).
4. **Correction Loop:** The Head or the Local Workers rectify any discrepancies flagged during the automated review.
5. **Human Validation:** The Human-in-The-Loop (System Architect) conducts a manual system review and visual testing.
6. **Final CI/CD Build:** Upon Human approval, the Senior Build Engineer (Claude / Antigravity) is pinged to execute the build tools, resolve missing dependencies, and push the verified module to the NPM registry.
