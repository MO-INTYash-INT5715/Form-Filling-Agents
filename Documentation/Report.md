# Form Filling Agents — Design & Evaluation Report

**Repository:** Form Filling Agents (FFA)
**Author:** Yash Sarang
**Last updated:** 2026-05-27
**Status:** Active — Extension benchmarked; Web Portal scaffolded; **MCP-implementations track (live forms) is the current focus.**

> This document is the canonical research-style report for the repository.
> It is regenerated whenever a major change lands (see `scripts/update-report.sh`).

---

## Abstract

We study automated *form filling* as a two-stage mapping problem:
(i) extracting structured values from unstructured user documents, and
(ii) resolving those values onto interactive DOM elements of an arbitrary web form.
We implement and benchmark five isolated agent strategies — rule-based,
embedding-matcher, LLM-structured, VLM, and a DOM+VLM hybrid — plus an
MCP-orchestrated agent, on the FormFactory benchmark (25 forms, 8 domains,
~260 fields). We pair the browser extension with a server-side web portal
that parses uploaded documents into a shared `UserProfile` and fills target
URLs via headless Playwright. Current results confirm that lightweight
rule-based filling is a strong baseline (~57.7% value accuracy) while
MCP-style step-by-step agents pay heavy latency for marginal returns
(~0.2% on our harness) without per-step grounding.

---

## 1. Introduction

Web forms remain the dominant interface for transactional data entry
(job applications, grants, registrations, healthcare intake). Existing
solutions — browser autofill, RPA scripts, password managers — either
cover trivial fields only or require per-site engineering. Recent LLM
and VLM advances make general-purpose form filling tractable, but
trade off accuracy, latency, cost, and privacy in ways that are not
yet well measured on heterogeneous form corpora.

This report (a) defines the agent interface and benchmark used in this
repository, (b) compares five implementation archetypes, and (c) maps
the planned hybrid neuro-symbolic approach that motivates the web-portal
track.

---

## 2. System Architecture

The repository ships two parallel delivery tracks that share a common
agent contract and `UserProfile` schema.

```
┌──────────────────────┐     ┌──────────────────────┐
│  Browser Extension   │     │     Web Portal       │
│ (Chrome MV3 / FF MV2)│     │ (Next.js + Playwright)│
└──────────┬───────────┘     └──────────┬───────────┘
           │  UserProfile (JSON)        │
           └────────────┬───────────────┘
                        ▼
            ┌──────────────────────┐
            │  Agent Implementations│  (isolated, plug-in)
            │  rule-based / emb /   │
            │  llm-structured /     │
            │  vlm / hybrid / mcp   │
            └──────────┬───────────┘
                        ▼
            ┌──────────────────────┐
            │  Executor (Playwright │
            │  or DOM FormFiller)   │
            └──────────────────────┘
```

**Key invariants**

- `extension/src/implementations/<name>/` is self-contained; it may only
  import `src/types/` and `src/utils/`. Zero cross-agent coupling.
- Every agent implements `Agent { name, analyze(form, profile), isApplicable(...) }`.
- All agents are evaluated on the identical FormFactory harness
  (`scripts/run-benchmark.ts`), output landing in
  `benchmark-results/<agent>/`.
- `UserProfile` is the single input contract. Extension produces it
  from `pipeline/input-pipeline.ts`; portal produces it from
  `web-portal/src/parsers/document-parser.ts`.

---

## 3. Agent Implementations

| # | Agent | Approach | Cost | Folder |
|---|-------|----------|------|--------|
| 1 | Rule-based | Keyword + regex on label/name/id | None | `extension/src/implementations/rule-based/` |
| 2 | Embedding matcher | Cosine sim. on local MiniLM embeddings | CPU | `embedding-matcher/` |
| 3 | LLM-structured | Serialized a11y tree → schema-constrained JSON | API tokens | `llm-structured/` |
| 4 | VLM agent | Screenshot + ruler markers → VLM bbox selection | High API | `vlm-agent/` |
| 5 | Hybrid | Rule-based first; below-threshold fields → VLM | Adaptive | `hybrid/` |
| 6 | MCP agent | Iterative tool calls via Browser/PlaywrightMCP | Very high | `mcp-agent/` |

---

## 4. Benchmark Harness

- **Dataset:** FormFactory — 25 HTML forms across 8 domains
  (Academic, Professional, Healthcare, Legal, Civic, Financial,
  Commerce, Lifestyle); ~260 ground-truth fields.
- **Serving:** local Flask server at `http://localhost:5000` exposes
  each form template.
- **Execution:** `extension/scripts/run-benchmark.ts` drives a
  Playwright Chromium instance; each agent returns an `AgentAction[]`
  sequence (`type`, `click`, `select`).
- **Metrics:** click accuracy, value accuracy, form completion rate,
  per-domain breakdown, per-field-type breakdown.
- **Outputs:** `benchmark-results/<agent>/<form>_<n>.json` plus
  aggregate `benchmark-report.json`.

---

## 5. Results (current)

Aggregated from `benchmark-results/*/benchmark-report.json`:

| Agent | Total fields | Overall value acc. | Form completion rate |
|-------|--------------|--------------------|----------------------|
| rule-based | 259 | **57.66%** | 57.66% |
| mcp-agent  | 116 | 0.21% | 0.21% |
| embedding-matcher | — | pending aggregation | — |
| vlm-agent  | — | pending aggregation | — |
| llm-structured | — | pending aggregation | — |
| hybrid | — | pending aggregation | — |

**Reading the numbers.** The rule-based baseline is surprisingly
competitive because FormFactory labels are well-formed and templates
expose stable `name`/`id` attributes. The MCP agent's collapse is not
a model failure — it reflects an evaluation mismatch: MCP agents act
across many turns and frequently exit before submission, leaving most
fields unattempted (4/116 in the latest run). A per-step grounding
layer or a turn budget per field is required before the MCP path can
be fairly compared.

---

## 5b. Current Focus — MCP-Driven Live-Form Track

The FormFactory benchmark is a controlled corpus. To probe how these
agents behave on the real web, we add a third sibling track,
`mcp-implementations/`, that drives **live** public forms via three
different MCP servers, each isolated from the others and from the
extension/portal tracks.

| Implementation | MCP server | Status | Trade-off |
|----------------|-----------|--------|-----------|
| `playwright-mcp/` | `@playwright/mcp` (headless Chromium) | **Active prototype** | High throughput; vulnerable to bot detection |
| `browser-mcp/`    | BrowserMCP (real-browser bridge)      | Scaffold       | Real fingerprint, real cookies; single-session |
| `skyvern-mcp/`    | Skyvern (vision-first agent)          | Scaffold       | Goal-driven; opaque cost per step |

All three implement the same `MCPFormFiller` interface defined in
`mcp-implementations/shared/types.ts`. The shared comparison harness
(`mcp-implementations/shared/runner.ts`) drives every implementation
across every form in `live-forms.json` N times and writes
`benchmark-results/mcp-comparison.json`.

**Isolation rule (hard).** Each implementation folder owns its own
`package.json` and may only import from its own `src/` and from
`mcp-implementations/shared/`. No cross-implementation imports. This
prevents one prototype's dependency choices from leaking into the
others and keeps the comparison honest.

**Comparison axes.** Field accuracy, form-completion (did the form
reach a success state?), wall-clock latency, total LLM tokens, total
MCP tool calls, robustness across N repeated runs, and a categorised
failure breakdown (bot-detection, captcha, agentic-loop, hallucination,
popup, network, other).

---

## 6. Planned Approach — Hybrid Neuro-Symbolic

The target end-state combines the speed of symbolic execution with the
robustness of neural understanding, in a single forward pass per form
rather than a step-wise loop:

1. **Input pipeline (neural).** Document → `UserProfile` JSON via an
   LLM with a fixed output schema (`document-parser.ts`).
2. **DOM simplification (symbolic).** Page → minimal accessibility
   graph containing only interactive elements
   (`form-detection.ts` + `tree-serializer.ts`).
3. **Semantic mapping (neural).** A single LLM call maps
   `UserProfile` keys → DOM element IDs, emitting a strict
   `{ fieldId: value }` map.
4. **Execution (symbolic).** Playwright (portal) or `FormFiller`
   (extension) applies the map deterministically. A re-snapshot
   pass handles conditional sub-forms.
5. **Escalation (neural, on demand).** Unresolved or low-confidence
   fields fall back to the VLM agent with ruler-marked screenshots.

This is the architecture the **web-portal track** is being built
around (`web-portal/src/{parsers,scraper,filler}/`). The browser
extension keeps the local-first, opt-in posture for users who do
not want a server in the loop.

---

## 7. Roadmap

| Phase | Item | Status |
|-------|------|--------|
| 7.0 | Aggregate all `benchmark-results/*` into a single matrix | in progress |
| 7.1 | **`playwright-mcp` live-form prototype** | **active** |
| 7.2 | `browser-mcp` implementation | next |
| 7.3 | `skyvern-mcp` implementation | next |
| 7.4 | Cross-MCP comparison report (`benchmark-results/mcp-comparison.json`) | next |
| 7.5 | Wire the LLM-structured agent into the web portal `filler/` | planned |
| 7.6 | Portal: real `pdf-parse` / `mammoth` document parsers (replace stub) | planned |
| 7.7 | Add per-step grounding to `mcp-agent` for fair comparison | planned |
| 7.8 | CI: headless benchmark on PR (`test:quick` subset) | planned |
| 7.9 | Model proxy with PII redaction and key management | planned |

---

## 8. Repository Map

```
extension/                Browser extension (Chrome MV3 / FF MV2)
  src/
    agents/               High-level agent class
    background/           Service worker
    content/              Content scripts
    implementations/      Isolated agent strategies (one folder per archetype)
    pipeline/             UserProfile input pipeline
    utils/                form-detection, form-filler, storage
  scripts/                Benchmark CLI runner
web-portal/               Server-side Next.js implementation
  src/
    parsers/              Document → UserProfile
    scraper/              URL → ScrapedForm (Playwright)
    filler/               ScrapedForm + UserProfile → FillResult
    api/                  fill.ts, parse.ts
mcp-implementations/      MCP-driven live-form fillers (current focus)
  shared/                 types.ts, runner.ts, live-forms.json, user-profile.json
  playwright-mcp/         @playwright/mcp prototype (active)
  browser-mcp/            BrowserMCP (scaffold)
  skyvern-mcp/            Skyvern MCP (scaffold)
benchmark-results/        Per-agent + per-mcp benchmark outputs
Documentation/            All docs (this report lives here)
KnowledgeGraph/           Token-efficient repo index for AI agents
```

---

## 9. Maintenance

This report is regenerated whenever a major change lands. A change is
"major" if any of the following is true:

- A new agent folder is added under `extension/src/implementations/`.
- The `UserProfile` type changes (any of the three copies).
- A new `benchmark-report.json` is produced.
- The `web-portal/` track gains or removes a top-level module.
- Anything changes under `mcp-implementations/<impl>/src/` or `mcp-implementations/shared/`.
- A new `benchmark-results/mcp-<impl>/` directory appears.

The regeneration hook lives at `scripts/update-report.sh`. The matching
LaTeX rendering is `Documentation/Report.tex` and must be rebuilt with
`pdflatex Report.tex` after every update.

---

## Appendix A — Reproduce the Benchmarks

```bash
# Extension
cd extension
npm install
npm run build:extension
npm run test:quick               # 5-form smoke benchmark
npm run test:impl -- rule-based  # per-implementation run

# Web portal
cd web-portal
npm install
npx playwright install chromium
npm run dev

# MCP-implementations (current focus)
cd mcp-implementations/playwright-mcp
npm install
cp .env.example .env       # then set GITHUB_TOKEN (GitHub Models, OpenAI-SDK compatible)
# Drives installed Chrome (MCP_BROWSER_CHANNEL=chrome) — no chromium download.
npx tsx tests/smoke.test.ts                                # spawn server + list tools, no LLM
npx tsx src/index.ts fill \
  --url https://httpbin.org/forms/post \
  --profile ../shared/user-profile.json                    # one live form

# Cross-implementation comparison (from repo root)
npx tsx mcp-implementations/shared/runner.ts \
  --impls playwright-mcp --runs 3
# Output: benchmark-results/mcp-playwright-mcp/<form>_<r>.json
#         benchmark-results/mcp-comparison.json
```
