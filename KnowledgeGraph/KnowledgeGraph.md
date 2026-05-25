# Knowledge Graph — Form Filling Agents

> **For AI coding agents:** Read this file at the start of every session (~800 tokens).

**Last updated:** 2026-05-25

---

## How to Use This Knowledge Graph

The `KnowledgeGraph/graph/` folder contains structured JSON files that cache the repo's architecture. Load them instead of source files.

### Session Start Protocol

```
Step 1 — Always: Read KnowledgeGraph/KnowledgeGraph.md
Step 2 — If needed: Read the relevant graph/ JSON files
Step 3 — Only if the task requires it: Read the specific source file
```

### Which Graph File to Load

| Task type | Load this graph file |
| :--- | :--- |
| Adding/modifying agents | `graph/agents.json` |
| Form detection / utils logic | `graph/utils.json` |
| UI/popup changes | `graph/ui.json` |
| Benchmark / testing | `graph/benchmark.json` |

---

## Project Overview

| Field | Value |
| :--- | :--- |
| **Name** | Form Filling Agent Browser Extension |
| **Domain** | Commercial form automation |
| **Stack** | TypeScript, Next.js, WebExtensions API |
| **Main URL** | `public/` (extension base) |
| **Benchmark** | FormFactory (25 forms, 13,800 pairs) |

---

## Architecture Map

```
├── public/                    # Manifests, static assets
├── src/
│   ├── agents/                # Form filling agents (form-agents.ts)
│   ├── background/            # Service worker (service-worker.ts)
│   ├── content/               # Content scripts (content-script.ts)
│   ├── popup/                 # UI pages (Next.js)
│   ├── options/               # Settings pages
│   ├── types/                 # TS definitions
│   └── utils/                 # Detection, filler, storage
├── package.json
└── tsconfig.json
```

---

## Active State

- **Status:** Active development — Extension architecture stabilized, benchmarking pipeline integrated. Phase 1 UserProfile wiring completed.
- **Current focus:** Improving detection accuracy and expanding agent capabilities.
- **Last significant change:** Reverted embedding based implementation mess, finalized Phase 1 UserProfile wiring, and cleaned up KnowledgeGraph structure.
