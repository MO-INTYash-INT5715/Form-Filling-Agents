# Architecture & Workflows (Canonical)

This document is the canonical merge of overlapping architecture content from:
- `Implementation.md`
- `Flow.md`
- `Explanation.md`
- `WebPortal.md`

It reflects the current repository layout (`extension/`, `web-portal/`, `mcp-implementations/`).

---

## 1. Tracks in this repository

| Track | Path | Purpose |
|---|---|---|
| Browser Extension | `extension/` | Main benchmarked implementation on FormFactory |
| Web Portal | `web-portal/` | Server-side URL scraping + headless form filling |
| MCP Implementations | `mcp-implementations/` | Live-form MCP agent experiments (PlaywrightMCP, BrowserMCP, SkyvernMCP) |

All tracks use the same core concept: a `UserProfile` JSON mapped to form fields.

---

## 2. End-to-end benchmark workflow (extension track)

1. Input instance + gold answers are loaded from the FormFactory dataset.
2. An agent implementation (rule-based, embedding-matcher, llm-structured, hybrid, mcp-agent, vlm/vision where supported) generates field actions.
3. Playwright executes actions in a browser against the Flask form server (`http://localhost:5000`).
4. The evaluator compares submitted values against gold answers and writes reports in `benchmark-results/<agent>/`.

Core implementation paths:
- Runner: `extension/scripts/run-benchmark.ts`
- Benchmark engine: `extension/src/benchmark/`
- Agents: `extension/src/implementations/`

---

## 3. Web portal workflow

1. Parse uploaded documents into a `UserProfile`.
2. Scrape fields from a target URL using Playwright.
3. Map `UserProfile` values to scraped fields.
4. Fill form headlessly and return structured result.

Key paths:
- Parser: `web-portal/src/parsers/document-parser.ts`
- Scraper: `web-portal/src/scraper/form-scraper.ts`
- Filler: `web-portal/src/filler/form-filler.ts`
- API routes: `web-portal/src/api/`

---

## 4. MCP workflow

MCP implementations are isolated from extension/portal code and share only `mcp-implementations/shared/*` contracts.  
Current active implementation: `mcp-implementations/playwright-mcp/`.

---

## 5. Implementation boundaries

- Agent implementations stay isolated per folder.
- Benchmark and scorer code stays under `extension/src/benchmark/`.
- Cross-track type parity (`UserProfile`) must be maintained manually across:
  - `extension/src/types/index.ts`
  - `web-portal/src/types/index.ts`
  - `mcp-implementations/shared/types.ts`

---

## 6. Related docs

- Run commands and benchmark runbook: `RUNNING_AND_BENCHMARKING.md`
- Consolidated status and timeline: `PROJECT_STATUS.md`
- Detailed research report: `Report.md`

