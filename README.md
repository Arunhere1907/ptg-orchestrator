# PTG Orchestrator : Pluggable Task Graph Bug-Fixing Pipeline

> **India RUNS Hackathon 2026 · Challenge 1 — Build an AI System**  
> Track: Developers, Engineers, Technical Builders

---

## What It Does

PTG Orchestrator is a multi-agent AI system that takes a bug description or GitHub Issue link and autonomously decomposes, fixes, and audits the code without the developer leaving their workflow.

A developer pastes a bug. Three AI agents handle the rest:

1. **The Architect** breaks the problem into an atomic task graph (JSON)
2. **The Executor** reads the workspace via MCP, writes the patch, saves the file
3. **The Auditor** reviews the diff for SQL injection, logic errors, or syntax bugs before signing off

The developer stays in control via a **Human-in-the-Loop gate** ; the system pauses before any destructive file write and shows a live diff, asking for approval before proceeding.

---

## Demo

**Live pipeline flow:**
```
Input: "Fix SQL injection in db.ts by using parameterized query"
  ↓
[ARCHITECT] Task graph generated → 3 atomic steps
  ↓
[EXECUTOR] MCP read: db.ts → patch prepared → HitL gate → APPROVED → file saved
  ↓
[AUDITOR] Security scan → VERDICT: PASS — No critical issues detected
  ↓
db.ts badge: BUGGY → PATCHED
```

**Demo workspace presets** (no setup needed):
- `billing.ts` — Double taxation bug (VAT applied twice)
- `auth.ts` — Token invalidation logic error
- `db.ts` — SQL injection via direct string interpolation

---

## Architecture

```
User Input (Bug Description / GitHub Issue URL)
         │
         ▼
┌─────────────────────┐
│   ARCHITECT AGENT   │  → Generates JSON task graph (locate → rewrite → audit)
└────────┬────────────┘
         │ task graph
         ▼
┌─────────────────────┐
│   EXECUTOR AGENT    │  → MCP filesystem read/write → HitL approval gate
└────────┬────────────┘
         │ patch diff
         ▼
┌─────────────────────┐
│    AUDITOR AGENT    │  → Line-by-line security + logic review → PASS/FAIL verdict
└─────────────────────┘
         │
         ▼
   Pipeline Execution Log + Updated Workspace
```

### Key Design Decisions

**Pluggable MCP Configuration** : Agents don't hardcode filesystem access. The MCP layer is configurable: point it at any local directory, SQLite DB, or GitHub repo. Add new MCP servers via the UI without touching agent code.

**State Visualization** : Every node shows live status: PENDING → IN_PROGRESS (pulsing) → COMPLETED / FAILED. Developers don't trust black boxes; the pipeline is fully transparent.

**Human-in-the-Loop Gate** : Before any file write, the Executor pauses and renders a side-by-side diff (original vs patch). The developer approves or rejects. If rejected, the pipeline aborts cleanly with a log entry.

**Structured Task Graph** : The Architect's output is a typed JSON object, not free-form text. This makes the pipeline deterministic and extensible — swap out any agent without breaking the others.

---

## Tech Stack

| Component | Technology |
|---|---|
| Frontend UI | HTML + CSS + Vanilla JS (single-file, zero build step) |
| AI Model | Gemini 3.5 Flash (via Google AI Studio) |
| Agent Orchestration | Sequential pipeline with state machine |
| MCP Integration | Pluggable MCP config (Filesystem, SQLite, GitHub API) |
| Workspace | In-browser file editor with diff viewer |
| Deployment | Static — deployable on GitHub Pages, Vercel, Netlify |

---

## Features

### Core Pipeline
- Natural language bug description → 3-agent resolution pipeline
- GitHub Issue URL ingestion (optional)
- Target workspace module selector (per-file scoping)
- Simulated MCP read/write with real file state tracking

### Live Pipeline State Panel
- Real-time node status with pulsing IN_PROGRESS animation
- Per-node status messages updating as pipeline progresses
- Directional flow visualization (ARCHITECT → EXECUTOR → AUDITOR)

### Human-in-the-Loop Modal
- Triggered automatically before destructive file writes
- Side-by-side diff: ORIGINAL (red) vs PROPOSED PATCH (green)
- APPROVE continues pipeline; REJECT aborts with log entry
- Non-dismissible — forces conscious developer decision

### Pipeline Execution Log
- Terminal-style streaming log with agent-prefixed entries
- Timestamped entries: `[ARCHITECT]`, `[EXECUTOR]`, `[AUDITOR]`, `[SYSTEM]`
- Architect's task graph rendered as formatted JSON inline
- Auto-scrolls to latest entry

### Workspace Explorer
- Multi-file editor with BUGGY → PATCHED badge transition post-fix
- Diagnostics & Threat Log per file (pre-loaded vulnerability descriptions)
- Reset workspace option

### Pluggable MCP Config Panel
- LOCAL FILESYSTEM MCP — configurable allowed paths + auth secret
- SQLITE DATABASE MCP — DB path + endpoint
- GITHUB REPOSITORIES MCP — API endpoint + auth (MOUNTED/UNMOUNTED toggle)
- `+ ADD MCP` for extensibility

---

## Getting Started

### Option 1: Open directly (no server needed)

```bash
# Unzip the exported archive
unzip ptg-orchestrator.zip
cd ptg-orchestrator

# Open in browser
open index.html
# or: double-click index.html
```

### Option 2: Serve locally

```bash
# Python
python -m http.server 3000

# Node
npx serve .
```

Then open `http://localhost:3000`

### Running a Demo

1. Click any preset card (e.g., **SQL INJECTION LEAK** → loads `db.ts`)
2. The bug description and target file auto-populate
3. Click **DECOMPOSE & GENERATE PIPELINE**
4. Watch the Live Pipeline State panel update in real time
5. When the HitL modal fires → review the diff → click **APPROVE & CONTINUE**
6. Watch the Auditor complete and the file badge flip to **PATCHED**

---

## Project Structure

```
ptg-orchestrator/
├── index.html          # Main application (all UI + logic)
├── README.md           # This file
└── assets/             # Icons, fonts (if any)
```

> The entire application is a single self-contained HTML file. This was an intentional constraint for the hackathon — zero dependencies, zero build step, deployable anywhere.

---

## Alignment with Challenge 1

| Requirement | Implementation |
|---|---|
| Autonomous agents | 3-agent pipeline: Architect, Executor, Auditor |
| Multi-model coordination | Pluggable MCP config supports OpenAI, Gemini, Anthropic key swap |
| AI copilot that changes how work gets done | Developer inputs a bug, pipeline handles decompose → fix → audit |
| Technical AI-native system | Task graph JSON, MCP filesystem abstraction, agent state machine |
| Makes work smarter | Eliminates manual: issue triage, code location, patch writing, security review |

---

## Roadmap (Post-MVP)

- Real LLM calls replacing simulated pipeline (model-agnostic via pluggable config)
- Actual MCP server integration (standard FileSystem + SQLite MCPs)
- GitHub PR auto-creation after Auditor PASS
- Multi-file patching across a repository
- Persistent pipeline history and audit log export
- VS Code extension wrapper

---

## Author

**Arun** · IIIT Vadodara · B.Tech CSE (AI/ML) · Batch 2025–2029  
Built for India RUNS Hackathon 2026 · Challenge 1

---

## License

MIT
