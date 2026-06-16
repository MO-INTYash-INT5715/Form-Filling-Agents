# Knowledge Graph — Form Filling Agents

> **For AI coding agents:** Read this file at the start of every session (~800 tokens).

**Last updated:** 2026-06-16

---

## How to Use This Knowledge Graph

The `KnowledgeGraph/graph/` folder contains structured JSON files that cache the repo's architecture. Load them instead of source files.

### Session Start Protocol

```
Step 1 — Always: Read KnowledgeGraph/KnowledgeGraph.md
Step 2 — If needed: Read the relevant graph/ JSON files
Step 3 — Only if the task requires it: Read the specific source file
Step 4 - Follow Caveman instructions: reply only what is relevant and important
```

### Which Graph File to Load

| Task type | Load this graph file |
| :--- | :--- |
| Adding/modifying extension agents | `graph/agents.json` |
| Form detection / utils logic (extension) | `graph/utils.json` |
| UI/popup changes (extension) | `graph/ui.json` |
| Benchmark / testing | `graph/benchmark.json` |
| MCP-based live-form implementations | `graph/mcp-implementations.json` |

---

## Project Overview

| Field | Value |
| :--- | :--- |
| **Name** | Form Filling Agents |
| **Domain** | Commercial form automation |
| **Stack** | TypeScript, Next.js, WebExtensions API, Playwright |
| **Implementations** | Browser Extension + Web Portal (parallel tracks) |
| **Benchmark** | FormFactory (25 forms, 13,800 pairs) |

---

## ⚠️ REPO RESTRUCTURE — 2026-05-26

The repository was reorganised. All extension code moved from root `src/` → `extension/src/`.
A new `web-portal/` top-level folder was created for the portal implementation.

**Old path → New path (extension files):**
- `src/` → `extension/src/`
- `public/` → `extension/public/`
- `scripts/` → `extension/scripts/`
- `tsconfig*.json` → `extension/tsconfig*.json`
- `next.config.js`, `postcss.config.js`, `tailwind.config.js` → `extension/`

Do NOT reference bare `src/` paths — they no longer exist at root.

---

## Architecture Map

```
├── extension/                 # Browser Extension (Chrome MV3 / Firefox MV2)
│   ├── public/                # Manifests, static assets, compiled JS
│   ├── src/
│   │   ├── agents/            # High-level agent classes (form-agents.ts)
│   │   ├── background/        # Service worker (service-worker.ts)
│   │   ├── content/           # Content scripts (content-script.ts)
│   │   ├── implementations/   # Isolated agent strategies
│   │   │   ├── rule-based/
│   │   │   ├── embedding-matcher/
│   │   │   ├── llm-structured/
│   │   │   ├── vlm-agent/
│   │   │   ├── hybrid/
│   │   │   └── mcp-agent/
│   │   ├── popup/             # Popup UI (Next.js)
│   │   ├── options/           # Settings page
│   │   ├── pipeline/          # UserProfile input pipeline
│   │   ├── types/             # TS definitions
│   │   └── utils/             # form-detection, form-filler, storage
│   └── scripts/               # Benchmark CLI runner
│
├── web-portal/                # Web Portal (NEW — server-side Next.js)
│   ├── src/
│   │   ├── types/             # Shared types (UserProfile, ScrapedForm, FillResult…)
│   │   ├── parsers/           # Document → UserProfile (PDF, DOCX, TXT, JSON)
│   │   ├── scraper/           # URL → ScrapedForm (Playwright headless)
│   │   ├── filler/            # ScrapedForm + UserProfile → FillResult
│   │   └── api/               # API route handlers (fill.ts, parse.ts)
│   └── app/                   # UI pages and components
│
├── mcp-implementations/       # MCP-driven live-form fillers (NEW — current focus)
│   ├── shared/                # types.ts, runner.ts, live-forms.json, user-profile.json
│   ├── playwright-mcp/        # IMPL-A — @playwright/mcp (ACTIVE prototype)
│   ├── browser-mcp/           # IMPL-B — BrowserMCP (scaffold)
│   └── skyvern-mcp/           # IMPL-C — Skyvern MCP (scaffold)
│
├── benchmark-results/         # Benchmark outputs (shared — all agents + mcp-*)
├── Documentation/             # All docs (Report.md, Report.tex, …)
│   └── ABLATION-MASTER-REPORT.md # Multi-track comparative cost and accuracy ablation report
└── KnowledgeGraph/            # This file + graph/ JSON cache
```

---

## Active State

- **Status:** Extension architecture updated for full Bedrock/Gemini/OpenAI/Ollama multi-provider LLM support (aligned with mcp-implementations and web-portal).
- **What works:** Parallel tracks for Extension, Web Portal, and MCP-based agents. MCP Value-Accuracy tracking and dynamic cost calculations are integrated and functional.
- **Known risk areas:** Environment-specific `.env` configuration for Bedrock/AWS credentials across different implementation subfolders (`extension/`, `web-portal/`, `mcp-implementations/`).
- **Recommended next milestone:** Execution of the multi-track benchmark sweep to produce full comparative metrics.
- **Isolation rule (hard):** every `mcp-implementations/<name>/` folder has its own `package.json` and may only import from its own `src/` and from `mcp-implementations/shared/`. No cross-implementation imports.
- **Comparison harness:** `mcp-implementations/shared/runner.ts` drives multi-implementation comparisons and writes to benchmark results.
- **Docs source of truth:** `Documentation/README.md` and `Documentation/REPOSITORY_POLICIES.md`.

---

## Key Shared Concept: UserProfile

`UserProfile` is the **single input** to every fill agent — extension, portal, and all MCP implementations.
- Extension: produced by `extension/src/pipeline/input-pipeline.ts`
- Portal: produced by `web-portal/src/parsers/document-parser.ts` from uploaded documents
- MCP implementations: consume `mcp-implementations/shared/user-profile.json` (sample) and the type from `mcp-implementations/shared/types.ts`
- Type definitions live in three places: `web-portal/src/types/index.ts`, `extension/src/types/index.ts`, `mcp-implementations/shared/types.ts`. Keep them in sync manually when fields change.
