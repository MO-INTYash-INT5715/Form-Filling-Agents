# Ablation Study — Master Plan

**Status:** Planning (no code changes yet)
**Owner:** FFA team
**Last updated:** 2026-06-11
**Scope:** Comparative ablation across **all three tracks** — Extension, Web Portal, MCP — covering **performance** and **cost**, with **on-demand LLM provider switching** (AWS Bedrock / Gemini / OpenAI / Ollama-local).

> Read alongside:
> - `API_setup.md` (provider switching contract)
> - `Documentation/RUNNING_AND_BENCHMARKING.md` (current commands)
> - `KnowledgeGraph/KnowledgeGraph.md` (architecture map)

---

## 0. Objective

Produce a single, reproducible body of evidence answering:

1. **Which agent strategy wins** on each track (accuracy, completion, latency)?
2. **What does each cost** per form / per correct field, per provider?
3. **How do the three tracks compare** to each other on a normalized basis?
4. **How does provider choice** (Bedrock vs Gemini vs OpenAI vs Ollama) change the accuracy/latency/cost trade-off for the *same* agent?

The end state is a **Master Ablation Report** that stitches all three tracks and all providers into one comparison, generated from machine-readable artifacts so it can be regenerated on demand.

---

## 1. Current-State Inventory (verified against the repo)

### 1.1 Extension track — MATURE
- Harness: `extension/scripts/ablation-study.ts` → writes `Documentation/ABLATION-STUDY.md` + `Documentation/ablation-data.json`.
- Per-agent benchmark: `extension/scripts/run-benchmark.ts` → `extension/src/benchmark/runner.ts`.
- Metric model: `extension/src/benchmark/types.ts`
  - **Atomic** (per field-type click + value accuracy), **Episodic** (form completion, fields correct), **BLEU-4** for `Description`, token in/out, LLM time, LLM calls, per-domain.
- Agents covered: `rule-based`, `embedding-matcher`, `llm-structured`, `hybrid`, `mcp-agent`, `vision-agent`, `vlm-agent`.
- Cost model: inline `COST_MODEL` (only `ollama`=$0, `openai`=gpt-4o-mini rates, `custom`=$0).
- Output dirs present: `benchmark-results/{rule-based,embedding-matcher,llm-structured,hybrid,mcp-agent,vlm-agent}`.

### 1.2 Web Portal track — FUNCTIONAL, INCOMPLETE FOR ABLATION
- Harness: `web-portal/benchmark.ts` → 3 agents (`rule-based`, `embedding-matcher`, `llm-structured`) vs the 25-form catalogue, writes `benchmark-results/web-portal-<agent>/`.
- Telemetry: `web-portal/src/telemetry/tracker.ts` + `src/types/telemetry.ts` capture timing, fields, and **LLMUsage (model, tokens, costUsd, latency)** — but `benchmark.ts` does **not** use them.
- Runner: `web-portal/src/agents/runner.ts` (`runAllStrategies`) wraps telemetry; used by the live API, not the benchmark.
- Output dirs present: `benchmark-results/{web-portal-rule-based,web-portal-embedding-matcher,web-portal-llm-structured}`.

### 1.3 MCP track — PROTOTYPE
- Harness: `mcp-implementations/shared/runner.ts` (+ `shared/types.ts`) → runs implementations across `shared/live-forms.json`, writes `benchmark-results/mcp-<impl>/` and `benchmark-results/mcp-comparison.json`.
- Active impl: `playwright-mcp` (OpenAI-SDK-compatible client, env-switchable base URL/model). `browser-mcp` + `skyvern-mcp` are **stubs**.
- Metrics: success rate, avg accuracy = `fieldsFilled/fieldsExpected`, avg duration, avg tool calls, total tokens, failure-category breakdown. **No $ cost.**

### 1.4 Dataset (verified)
- FormFactory root: `C:\Code\formfactory`
- Gold answers: `C:\Code\formfactory\data\data1\<stem>.json` (array of instances)
- Input docs: `C:\Code\formfactory\data\data2\`
- BBox screenshots: `C:\Code\formfactory\data\labeled-images\`
- Reference evaluator: `C:\Code\formfactory\eval\evaluator.py` (ground truth = `../data/data1`).
- Flask server: `python app.py` → `http://localhost:5000`.

---

## 2. Gap Analysis (what blocks a clean ablation today)

### 2.1 Per-track gaps
| # | Track | Gap | Impact |
|---|-------|-----|--------|
| G1 | Portal | `benchmark.ts` hardcodes `dataPath = 'D:/Code/formfactory'` (wrong drive **and** missing the `data/` segment; real path is `C:\Code\formfactory\data`) | Gold answers never load → value-accuracy is meaningless |
| G2 | Portal | Scoring is loose case-insensitive **substring** match, not FormFactory atomic/episodic + BLEU | Not comparable to extension |
| G3 | Portal | `benchmark.ts` ignores `LLMUsage` telemetry already captured | No token/cost columns for portal |
| G4 | Portal | No per-field-type accuracy, no submission verification | Incomplete vs extension |
| G5 | MCP | accuracy = fieldsFilled/expected (not value-correctness vs gold) | Overstates quality |
| G6 | MCP | No $ cost estimation (tokens only) | Can't compare cost |
| G7 | MCP | Runs only on `live-forms.json`, not FormFactory | Not comparable to other tracks |
| G8 | MCP | 2 of 3 impls are stubs | Limited breadth |
| G9 | Extension | Default ablation list omits `vision-agent`/`vlm-agent`; `INSTANCES` pinned to 1 even for `--full` | Incomplete sweep, no variance |

### 2.2 Cross-cutting gaps
| # | Gap | Impact |
|---|-----|--------|
| X1 | **Three different cost models**, none covering **Bedrock** or **Gemini** | No unified cost story |
| X2 | **No provider-sweep harness** (same agent × {Bedrock, Gemini, OpenAI, Ollama}) | Can't answer Q4 |
| X3 | **No cross-track master report** | No single comparison artifact |
| X4 | **Inconsistent scoring semantics** across tracks | Apples-to-oranges |
| X5 | **Single instance, no variance/CI** | No statistical confidence |
| X6 | **No fixed run manifest** (provider, model, seed, instance count, commit) | Not reproducible |

---

## 3. Unified Evaluation Framework (the contract everything conforms to)

### 3.1 Canonical metric set (every track must emit these)
A shared result schema, `AblationRecord`, captured per `(track, agent, provider, model, formId, instanceIndex)`:

```jsonc
{
  "track": "extension | web-portal | mcp",
  "agent": "rule-based | embedding-matcher | llm-structured | hybrid | mcp-agent | vision-agent | vlm-agent | playwright-mcp | ...",
  "provider": "openai | bedrock | gemini | ollama",
  "model": "gpt-4o-mini | anthropic.claude-3-5-sonnet | gemini-1.5-flash | qwen2.5:7b | ...",
  "formId": "Art_Exhibition_Submission_Form",
  "domain": "Creative & Arts",
  "instanceIndex": 0,

  // Performance
  "fieldsTotal": 12,
  "fieldsAttempted": 11,
  "fieldsCorrect": 9,            // value-accurate vs gold (atomic)
  "valueAccuracyPct": 75.0,      // fieldsCorrect / fieldsTotal
  "completionRatePct": 75.0,     // episodic: correct AND submitted
  "perFieldType": { "String": 80, "Dropdown": 66, "Date": 100, "Description": 71, "...": 0 },
  "bleuDescription": 71.2,       // null if no Description fields

  // Latency
  "wallMs": 145800,
  "llmMs": 120300,
  "llmFraction": 0.83,

  // Cost
  "tokensIn": 600,
  "tokensOut": 150,
  "llmCalls": 1,
  "toolCalls": 0,                // MCP only
  "costUsd": 0.00012,

  // Robustness
  "submitted": true,
  "error": null,
  "failureCategory": null,       // bot-detection | captcha | agentic-loop | hallucination | popup | network | other

  // Repro
  "runId": "…", "commit": "…", "seed": 0, "startedAt": "…", "finishedAt": "…"
}
```

Derived/rollup metrics (computed by the aggregator, §6):
- `tokensPerCorrectField = (tokensIn+tokensOut) / fieldsCorrect`
- `costPerForm`, `costPerCorrectField`
- `accuracy@cost` frontier points (Pareto)
- mean ± 95% CI across instances (§3.4)

### 3.2 Scoring normalization (resolves X4, G2, G5)
- **Single source of truth for scoring:** port the extension's atomic/episodic + BLEU logic into a shared, framework-agnostic scorer module reused by all three tracks (or shell out to `formfactory/eval/evaluator.py` for a second opinion).
- Exact match: case-insensitive, trimmed, for all field types except `Description`.
- `Description`: BLEU-4 ≥ threshold (reuse extension threshold).
- Gold answers always loaded from `C:\Code\formfactory\data\data1\<stem>.json`.
- MCP track: when run against FormFactory forms, score with the **same** scorer (not fill-rate). Keep the live-forms fill-rate as a *separate* "in-the-wild" robustness metric.

### 3.3 Unified cost model (resolves X1, G6) — `shared/cost-model.ts`
One table, keyed by `provider:model`, USD per 1M tokens (input/output). Cost comes from **measured tokens × table**, never guessed.

```ts
export const COST_PER_1M: Record<string, { in: number; out: number }> = {
  // OpenAI
  "openai:gpt-4o":             { in: 2.50, out: 10.00 },
  "openai:gpt-4o-mini":        { in: 0.15, out: 0.60 },
  // Gemini
  "gemini:gemini-1.5-flash":   { in: 0.075, out: 0.30 },
  "gemini:gemini-1.5-pro":     { in: 1.25, out: 5.00 },
  // AWS Bedrock (fill in exact region pricing on receipt of keys)
  "bedrock:anthropic.claude-3-5-sonnet": { in: 3.00, out: 15.00 },
  "bedrock:anthropic.claude-3-haiku":    { in: 0.25, out: 1.25 },
  "bedrock:meta.llama3-70b":             { in: 0.99, out: 0.99 },
  // Local
  "ollama:*":                  { in: 0, out: 0 },   // electricity only; report $0
};
```
- For local models, cost = $0 but **record wall/LLM time** (the real cost is latency/hardware).
- Token counts MUST be measured from the provider response (`usage`), with a tokenizer-based estimate as fallback only when the API omits usage.

### 3.4 Statistical rigor (resolves X5)
- Default ablation: **N = 5 instances per form** (quick = 1, full = 50 to match paper scale).
- Report **mean ± 95% CI** per metric (CI via t-distribution over instances).
- Fix `seed` and the instance index list in the run manifest for repeatability.

### 3.5 Provider abstraction (resolves X2) — prerequisite, see `API_setup.md`
A shared `chatCompletion()` / `embeddings()` interface with a normalized `{ text, toolCalls, usage }` return, implemented for `openai` (incl. OpenAI-compatible gateways → covers Ollama, and Bedrock/Gemini via gateway) and optionally native `bedrock` / `gemini` adapters. Selected by `LLM_PROVIDER`/`LLM_MODEL`/`LLM_BASE_URL`/`LLM_API_KEY`.

---

## 4. Experimental Design

### 4.1 Variables
- **Independent — agent strategy** (per track, see §5).
- **Independent — provider/model** (the sweep): `{ openai:gpt-4o-mini, gemini:gemini-1.5-flash, bedrock:<model>, ollama:qwen2.5:7b }`. Non-LLM agents (rule-based, embedding-matcher-local) are provider-invariant → run once.
- **Controlled:** same 25 forms, same instance indices, same `UserProfile`/input docs, same machine, headless, fixed `MAX_TURNS_PER_FORM`, same scorer, same commit.
- **Dependent:** all metrics in §3.1.

### 4.2 Run matrix
| Track | Agents | Provider sweep? | Forms × Instances |
|-------|--------|------------------|-------------------|
| Extension | rule-based, embedding-matcher, llm-structured, hybrid, mcp-agent, vision-agent\*, vlm-agent\* | LLM agents: yes; non-LLM: once | 25 × {1 quick / 5 default / 50 full} |
| Web Portal | rule-based, embedding-matcher, llm-structured | llm-structured: yes; others once | 25 × {1 / 5 / 50} |
| MCP | playwright-mcp (browser-mcp, skyvern-mcp when ready) | yes | 25 FormFactory + live-forms.json |

\* vision/vlm require a multimodal model (e.g. `gemini-1.5-flash`, `gpt-4o`, `qwen2.5vl:7b`); skip text-only providers for these.

### 4.3 Estimated run budget (default N=5)
- Non-LLM agents: cheap, seconds/form.
- LLM agents per provider: ~25 forms × 5 × per-form latency. Cloud providers ~2–5 s/form; MCP iterative ~20–60 s/form. Budget the MCP × provider sweep as the long pole; allow overnight `--full`.

---

## 5. Per-Track Execution Plans

### Track A — Extension (smallest delta)
1. **Cost model:** replace inline `COST_MODEL` with shared `shared/cost-model.ts`; key on `provider:model` from env.
2. **Provider sweep:** add `--providers` flag that loops the env across the sweep set and tags each `AblationRecord` with `provider`/`model`.
3. **Instances:** honor `--instances N` (fix the hardcoded `INSTANCES = 1`); default 5.
4. **Agents:** include `vision-agent`/`vlm-agent` in the sweep only when a multimodal model is selected.
5. **Emit** `AblationRecord[]` (§3.1) to `benchmark-results/extension/<provider>/<agent>.jsonl` in addition to the existing markdown.

### Track B — Web Portal (largest delta)
1. **Fix G1:** `dataPath = 'C:/Code/formfactory/data'` (configurable via `--data` / `FORMFACTORY_DATA`).
2. **Fix G2/G4:** replace substring scorer with the shared scorer (§3.2); add per-field-type + episodic + BLEU; optionally drive submission via the existing Playwright executor in `src/agents/runner.ts`.
3. **Fix G3:** thread `LLMUsage` (already in telemetry) into the report; compute cost via shared model.
4. **Provider wiring:** apply `API_setup.md` §5 changes to `llm-structured.ts` + `embedder.ts` (base URL/key/model from env) so the sweep works.
5. **Emit** `AblationRecord[]` to `benchmark-results/web-portal/<provider>/<agent>.jsonl`.

### Track C — MCP (most new work)
1. **FormFactory adapter:** add a mode to run `playwright-mcp` against the 25 local FormFactory URLs (reuse the form catalogue) so results are comparable; keep `live-forms.json` as a separate robustness suite.
2. **Fix G5:** score filled values against gold with the shared scorer (not fill-rate).
3. **Fix G6:** add token→cost via shared cost model; record `toolCalls`.
4. **Provider sweep:** `playwright-mcp` already env-switchable; tag records with provider/model.
5. **Emit** `AblationRecord[]` to `benchmark-results/mcp/<impl>/<provider>.jsonl`.
6. (Later) implement `browser-mcp` / `skyvern-mcp` against the same contract.

---

## 6. Cross-Track Master Report (the headline deliverable)

New aggregator (e.g. `scripts/aggregate-ablation.ts` at repo root) that:
1. Globs every `benchmark-results/**/**.jsonl` (`AblationRecord[]`).
2. Rolls up mean ± 95% CI per `(track, agent, provider)`.
3. Generates `Documentation/ABLATION-MASTER-REPORT.md` containing:
   - **§A Overall leaderboard** — value accuracy, completion, latency, cost/form (all tracks, all providers).
   - **§B Cost vs accuracy Pareto frontier** — who's on the efficient frontier.
   - **§C Provider sweep** — same agent across Bedrock/Gemini/OpenAI/Ollama (accuracy, latency, cost).
   - **§D Per-field-type heatmap** — String/Dropdown/Date/Description/Checkbox/Numeric.
   - **§E Per-domain breakdown** — 8 FormFactory domains.
   - **§F Robustness** — MCP failure categories + live-form pass rate.
   - **§G Track-vs-track** — extension vs portal vs MCP on the normalized scorer.
   - **§H Reproducibility appendix** — run manifest(s), commit, env.
4. Emits `Documentation/ablation-master-data.json` for charts.
5. (Optional) Charts via the portal dashboard's existing `ComparisonTable`/`ResultsTable` components or a small static chart export.

---

## 7. Reproducibility & Environment

- **Run manifest** (`benchmark-results/run-manifest.json`) per ablation campaign: commit SHA, OS, Node version, provider/model per track, instance indices, seed, FormFactory data path, server URL, timestamps.
- **Env contract** (shared by all tracks): `LLM_PROVIDER`, `LLM_MODEL`, `LLM_BASE_URL`, `LLM_API_KEY` (+ `AWS_*` / `GEMINI_API_KEY`) per `API_setup.md`.
- **Preconditions checklist:** Flask server up at `:5000`; Playwright Chromium installed (`npm run benchmark:setup`); provider keys present; Ollama model pulled for local runs.
- **Determinism:** `temperature = 0` everywhere; fixed instance list; pinned model versions (Bedrock/Gemini model IDs recorded exactly).

---

## 8. Deliverables & File Layout

```
shared/                              # NEW (cross-track utilities)
  cost-model.ts                      # unified provider:model → $/1M
  scorer.ts                          # atomic + episodic + BLEU (port from extension)
  ablation-record.ts                 # AblationRecord type + JSONL writer
scripts/
  aggregate-ablation.ts              # NEW — builds master report
extension/scripts/ablation-study.ts  # MODIFIED — cost model, --providers, --instances, JSONL out
web-portal/benchmark.ts              # MODIFIED — path fix, shared scorer, cost, JSONL out
mcp-implementations/shared/runner.ts # MODIFIED — FormFactory mode, shared scorer, cost, JSONL out
benchmark-results/
  run-manifest.json                  # NEW
  extension/<provider>/<agent>.jsonl
  web-portal/<provider>/<agent>.jsonl
  mcp/<impl>/<provider>.jsonl
Documentation/
  ABLATION-STUDY-PLAN.md             # THIS FILE
  ABLATION-MASTER-REPORT.md          # NEW — generated
  ablation-master-data.json          # NEW — generated
```

---

## 9. Phased Milestones (with acceptance gates)

| Phase | Deliverable | Done when |
|-------|-------------|-----------|
| **P0 — Foundations** | `shared/cost-model.ts`, `shared/scorer.ts`, `shared/ablation-record.ts` | Scorer reproduces extension's existing numbers on one agent within ±0.5% |
| **P1 — Provider abstraction** | Provider wiring per `API_setup.md` (portal + MCP standardized; extension cost keyed by provider) | Same agent runs unchanged on OpenAI **and** Ollama via env only |
| **P2 — Extension upgrade** | Track A §5 changes | Ablation emits JSONL + honors `--instances`/`--providers` |
| **P3 — Portal upgrade** | Track B §5 changes (path fix first) | Portal value-accuracy is gold-based + has cost columns |
| **P4 — MCP upgrade** | Track C §5 changes | MCP runs on FormFactory with gold scoring + cost |
| **P5 — Aggregator** | `scripts/aggregate-ablation.ts` + master report | `ABLATION-MASTER-REPORT.md` builds from JSONL with CIs |
| **P6 — Provider sweep** | Full {Bedrock, Gemini, OpenAI, Ollama} sweep (default N=5) | §C provider table + Pareto populated |
| **P7 — Docs & sign-off** | Update `PROJECT_STATUS.md`, `RUNNING_AND_BENCHMARKING.md`, KnowledgeGraph | Commands documented; report linked from `Documentation/README.md` |

Each phase is independently runnable and leaves the repo green (no broken scripts).

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Bedrock/Gemini tool-calling shape differs from OpenAI | Prefer OpenAI-compatible **gateway** (`API_setup.md` §4); native adapters only if needed |
| MCP latency makes full provider sweep slow | Sweep on quick (N=1) first; reserve `--full` for overnight; cap `MAX_TURNS_PER_FORM` |
| Local model lacks tool calling (e.g. gemma) | Pin `qwen2.5:7b`/`llama3.2:3b` for MCP (per `LOCAL-LLM-SETUP.md`) |
| Scorer drift between tracks | Single `shared/scorer.ts`; cross-check vs `formfactory/eval/evaluator.py` |
| Provider pricing changes | Centralized `cost-model.ts`; record model IDs + date in manifest |
| FormFactory path varies per machine | `FORMFACTORY_DATA` env + `--data` flag, default `C:\Code\formfactory\data` |
| Token usage missing from some providers | Tokenizer-based fallback estimate, flagged in record |

---

## 11. Acceptance Criteria (definition of "done, gap-free")

1. All three tracks emit the **same** `AblationRecord` schema with gold-based scoring.
2. A single command per track runs the ablation; a single aggregator builds the master report.
3. Cost is **measured** (tokens × unified model) for OpenAI, Gemini, Bedrock; $0 + latency for Ollama.
4. Provider sweep present for every LLM-dependent agent on every track.
5. Metrics reported as mean ± 95% CI over N≥5 instances.
6. `ABLATION-MASTER-REPORT.md` regenerates deterministically from JSONL + manifest.
7. No hardcoded broken paths (G1 fixed); all commands documented in `RUNNING_AND_BENCHMARKING.md`.
8. KnowledgeGraph + `Documentation/README.md` updated to point at this plan and the master report.

---

## 12. Open Questions (confirm before P6)

1. **Bedrock access path:** native AWS SDK adapter, or OpenAI-compatible gateway? (Plan defaults to gateway.)
2. **Bedrock model set** to include (Claude 3.5 Sonnet / Haiku / Llama3-70B / Titan)?
3. **Default N** for the headline report — 5 (fast) or 50 (paper-scale)?
4. **Submission verification** for portal/MCP — required for episodic parity, or accuracy-only for v1?
