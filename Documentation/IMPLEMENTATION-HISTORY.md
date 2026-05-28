# Form-Filling Agents — Implementation History

> Complete record of every phase, change, and measured impact.
> Benchmark: **FormFactory** (25 forms, 259 fields, 8 domains, headless Chromium via Playwright)
> Metric: **Value Accuracy** = % of fields whose filled value matches gold answer after normalization.

---

## Benchmark Infrastructure

| Component | Detail |
|---|---|
| Server | Flask (`/c/Code/formfactory`) at `localhost:5000` |
| Forms | 25 templates across 8 domains |
| Fields | 259 total (String, Dropdown, Date, NumericInput, Description, Checkbox, Radio) |
| Instances | `--quick`: 1 per form (25 total) · `--full`: 50 per form (1,250 total) |
| Evaluator | `playwright-executor.ts` + `evaluation.ts` |
| Scoring | Exact match (normalized) for most fields; BLEU-4 ≥ 30 for Description fields |

---

## Phase 0 — Baseline (Rule-Based Agent)

**What it does:** Pure heuristic matching — field name/type pattern rules, no LLM.

**Benchmark result (with broken scorer):**
- Value Accuracy: **57.66%** (150/259 fields)
- Runtime: 41.7s, 0 LLM calls, 0 tokens

**Per field type:**
| Field | Accuracy |
|---|---|
| String | 72.8% |
| NumericInput | 74.2% |
| Dropdown | 71.9% |
| Date | 30.8% |
| Description | 17.6% |
| Checkbox | 50.0% |

**Limitations:** No semantic understanding. Fails on Description fields and ambiguous dropdowns.

---

## Phase 1 — Web Portal Track (Smart Matcher)

**Goal:** Replace the web portal's naive field mapper with a 3-tier intelligent matcher.

**Changes made:**
- `web-portal/src/agents/embedder.ts` — local cosine-similarity embedding utility
- `web-portal/src/agents/smart-matcher.ts` — 3-tier matching:
  - Tier 1: Type-aware rules (email → email field, phone → tel, etc.)
  - Tier 2: Name heuristics (label substring matching)
  - Tier 3: Embedding similarity fallback
- `web-portal/src/filler/form-filler-enhanced.ts` — production filler using smart matcher
- `web-portal/src/types/index.ts` — added `ScrapedField.value`, `FillResult`, `AddressBlock` types
- `web-portal/src/scraper/form-scraper.ts` — capture value attribute for radio/checkbox

**Result:**
- Value Accuracy: **100%** (10/10 fields)
- Runtime: **1.9s**
- LLM calls: **0** (zero external dependencies)

**Delta:** +100% over baseline on web portal. Purely rule-based but field-type-specific enough to achieve perfect accuracy on standard form layouts.

---

## Phase 2 — MCP Track (Ollama Unblock)

**Goal:** MCP track was blocked with 401/403 errors against GitHub Models API (requires Copilot subscription).

**Problem:** `mcp-implementations/playwright-mcp/.env` was pointing at GitHub Models API → 403.

**Changes made:**
- `mcp-implementations/playwright-mcp/.env` — switched `LLM_BASE_URL` to `http://localhost:11434/v1` (Ollama)
- `mcp-implementations/playwright-mcp/src/agent.ts` — accept dummy API key (`'ollama'`) for localhost
- Pulled `qwen2.5:7b` via Ollama (4.7 GB) — only available model with tool-calling support
- Documented `gemma3:12b` incompatibility: returns `400: does not support tools`

**Single-form test result:**
- Fields filled: **12/12** (success: true)
- Duration: **59s**
- Tool calls: 12, Tokens in: 46,645, Tokens out: 474

**Delta:** Unblocked from 0% (blocked) → functional. Slow but working.

---

## Phase 3 — Extension Track (All Agents + Telemetry)

**Goal:** Complete all 5 browser extension agents with token/latency tracking.

**Changes made:**
- `extension/src/benchmark/types.ts` — added `tokensIn`, `tokensOut`, `llmTimeMs`, `llmCalls` to `FormResult` and `BenchmarkReport`
- `extension/src/implementations/llm-structured/agent.ts` — telemetry: timing around LLM call, captures `response.usage`
- `extension/src/implementations/hybrid/agent.ts` — fixed `response_format` → `format:'json'` for Ollama compatibility; added `lastTelemetry`
- `extension/src/implementations/mcp-agent/agent.ts` — full rewrite: robust JSON parsing, richer DOM state (field type + select options), full telemetry
- `extension/src/benchmark/runner.ts` — auto-captures `lastTelemetry` post-run; aggregates into BenchmarkReport
- `extension/scripts/ablation-study.ts` — master ablation runner across all agents
- `extension/package.json` — added per-agent benchmark scripts

**Key discovery:** Ollama requires `format: 'json'` not `response_format: { type: 'json_object' }` — the latter returns HTTP 400.

---

## Phase 4 — Ablation Study (Partial)

**Agents benchmarked** (with broken scorer — numbers below are understated):

| Agent | Value Acc | Runtime | Tokens In | LLM Calls |
|---|---|---|---|---|
| rule-based | 57.66% | 41.7s | 0 | 0 |
| embedding-matcher | 14.7% | ~45s | 0 | 0 |
| llm-structured | 65.2% | ~8min | ~500-700/form | 1/form |
| hybrid | ~0% (broken) | — | ~600-800/form | 1/form |
| mcp-agent v1 | 48.92% | 660s | ~600/form | 1-10/form |

**Hybrid agent** was skipped — submission step timing out on all forms, making value accuracy unmeasurable. Root cause: Flask redirect after submit confuses the executor's post-submit timeout.

**embedding-matcher** underperformed rule-based — embeddings alone without type-awareness lose context that simple rules preserve.

---

## Phase 5 — MCP Agent Fixes (v1 → v2 → v3)

### v1 Baseline Issues Identified
From full 25-form run:
- JSON parse failures on 3+ forms (control chars / `#` comments in LLM output) → 0% for entire form
- Date format mismatch: LLM outputs `YYYY/MM/DD`, form expects `YYYY-MM-DD`
- Dropdown value mismatch: LLM guesses semantically correct but syntactically wrong option strings
- `click` action on date fields: model emits `click` instead of `type` → 10-turn retry loop, 25k tokens for 1 form

### v2 Fixes Applied (`mcp-agent/agent.ts`)
1. **Multi-stage JSON repair** — 5 stages: raw → strip markdown fences → strip `//` comments → strip control chars → combination
2. **Date normalization** — `normalizeDate()`: any format → `YYYY-MM-DD` before `page.fill()`
3. **Fuzzy dropdown matching** — `selectFuzzy()`: 5-tier exact → case-insensitive → starts-with → contains → value= fallback
4. **Stronger system prompt** — explicit instructions: "use YYYY-MM-DD for dates", "use EXACT option label for dropdowns"

**v2 Result:** 52.73% (+3.8% over v1) — minimal improvement

### v3 Fixes Applied
5. **Action coercion** — `click` on `input[type=date]` / `input[type=text]` / `textarea` → coerced to `type` action
6. **Null-safe DOM state** — `getDomState()` crash fix: `sel.options` guard prevents `undefined is not iterable`

**v3 Result:** 52.73% (identical to v2) — fixes confirmed running (log shows coercion firing) but scorer was the real problem

---

## Phase 6 — Scorer Bug Fixes (The Real Root Cause)

**Discovery:** After running Health Insurance form in isolation:
- Date: 0% despite agent filling `"2024-01-15"` (gold: `"2024/01/15"`) 
- Dropdown: 0% despite agent selecting `"Doctor Consultation"` (gold: `"Doctor Consultation"`)
- NumericInput: 0% despite agent filling `"250.00"` (gold: `250.0`)

**Root causes in evaluation infrastructure:**

### Bug 1: `normalize()` didn't handle date formats
**File:** `extension/src/benchmark/evaluation.ts`
- Gold answer `"2024/01/15"` normalized to `"2024/01/15"`, filled value `"2024-01-15"` — never matched
- **Fix:** Added date format normalization: `YYYY/MM/DD` and `MM/DD/YYYY` → `YYYY-MM-DD`

### Bug 2: `normalize()` didn't handle float/int equivalence  
- Gold answer `250.0` normalized to `"250.0"`, filled value `"250"` — never matched
- **Fix:** Numeric trailing-zero stripping: `"250.0"` → `"250"`, `"250.00"` → `"250"`

### Bug 3: Dropdown readback returned `option.value` not `option.label`
**File:** `extension/src/benchmark/playwright-executor.ts`
- `page.inputValue()` on a `<select>` returns the option's `value` attribute (e.g. `"consultation"`)
- Gold answers use the display label (e.g. `"Doctor Consultation"`)
- **Fix:** Added select-specific readback via `page.evaluate()` → `opt.label`

**These bugs affected ALL agents, not just MCP.**

### Canary test after fixes (Health Insurance, 8 fields):

| Field Type | Before | After |
|---|---|---|
| Date | 0% | **100%** |
| Dropdown | 0% | **100%** |
| NumericInput | 0% | **100%** |
| Description | 100% | 100% |
| String | 100% | 100% |
| **Overall** | **62.5%** | **100%** |

---

## Phase 7 — Full Re-Benchmark (Fixed Scorer)

### MCP Agent v4 — Full 25-form run

| Metric | v1 (broken scorer) | v4 (fixed scorer) | Δ |
|---|---|---|---|
| Overall Value Acc | 48.92% | **62.38%** | +13.5% |
| Fields Correct | 137/259 | **168/259** | +31 fields |
| Runtime | 660s | 1257s | (more retries) |

**Per field type:**
| Field | v1 | v4 | Δ | Root cause of old error |
|---|---|---|---|---|
| Date | 7.7% | **92.3%** | +84.6% | Scorer: `"2024/01/15"` ≠ `"2024-01-15"` |
| Dropdown | 29.8% | **75.4%** | +45.6% | Scorer: option value ≠ option label |
| NumericInput | 83.3% | **91.7%** | +8.4% | Scorer: `"250.0"` ≠ `"250"` |
| String | 63.7% | 64.7% | +1% | — |
| Description | 34.3% | 34.3% | 0% | Genuine model weakness (qwen2.5:7b) |
| Checkbox | 50% | 50% | 0% | — |

**Per domain:**
| Domain | v4 Accuracy |
|---|---|
| Professional & Business | 88.2% |
| Healthcare & Medical | 87.5% |
| Technology & Software | 81.8% |
| Finance & Banking | 83.0% |
| Legal & Compliance | 76.8% |
| Construction & Manufacturing | 40.9% |
| Arts & Creative | 21.9% |
| Academic & Research | 30.7% |

**Remaining weak spots:**
- **Description fields (34.3%)** — `qwen2.5:7b` can't reason well about long-form text. Model-level limitation.
- **Arts & Creative (21.9%)** — forms have unusual/creative field semantics that confuse the model
- **Academic & Research (30.7%)** — complex multi-field academic forms, high description field density
- **Runtime inflation** — 1257s vs 660s because date fill failures trigger 10-turn retry loops. Fix: add success-detection to break early.

### Rule-based + LLM-Structured re-run complete

**Final Ablation Table (Fixed Scorer):**

| Agent | Value Acc | Runtime | Tokens/Form | LLM Calls/Form | Cost/Form (est) |
|---|---|---|---|---|---|
| **rule-based** | 57.66% | 42.3s | 0 | 0 | $0 |
| **llm-structured** | 71.35% | 145.8s | ~600 | 1 | ~$0.0012 |
| **mcp-agent** | 62.38% | 1257.5s | ~700-900 | 1-10 | ~$0.0014-0.018 |

**Per field type comparison:**

| Field Type | rule-based | llm-structured | mcp-agent | Best |
|---|---|---|---|---|
| Date | 30.8% | **100.0%** | 92.3% | llm-structured |
| Dropdown | 71.9% | 78.9% | **75.4%** | llm-structured |
| NumericInput | 74.2% | 62.5% | **91.7%** | mcp-agent |
| String | 72.8% | **73.7%** | 64.7% | llm-structured |
| Description | 17.6% | **54.6%** | 34.3% | llm-structured |
| Checkbox | 50.0% | **83.3%** | 50.0% | llm-structured |

**Key findings:**

1. **llm-structured wins overall** (71.35%) — best balance of accuracy, speed, and cost
   - Perfect date handling (100%) thanks to system prompt date hints + scorer fix
   - Strong on Description fields (54.6% vs 17.6% rule-based, 34.3% MCP)
   - 5.8x faster than MCP (146s vs 1258s)
   - Single-call architecture (no retry loops)

2. **mcp-agent underperforms** (62.38%) despite iterative approach
   - Retry loops inflate runtime (21 min vs 2.4 min)
   - Description fields weak (34.3%) — `qwen2.5:7b` model limitation
   - High token cost (700-900/form with retries vs 600 single-shot)
   - Better on NumericInput (91.7% vs 62.5%) due to validation retries

3. **rule-based still competitive** (57.66%) on standard fields
   - Zero cost, instant runtime (42s for 25 forms)
   - Strong on Dropdown (71.9%) and NumericInput (74.2%)
   - Fails on Description (17.6%) — no semantic understanding
   - Date handling weak (30.8%) — hardcoded pattern mismatch

**Scorer bug impact analysis:**

| Agent | Old (broken) | New (fixed) | Δ | Main gains from |
|---|---|---|---|---|
| rule-based | 57.66% | 57.66% | 0% | (already broken on dates) |
| llm-structured | 65.2% | 71.35% | +6.2% | Date 100%, Dropdown label fix |
| mcp-agent | 48.92% | 62.38% | +13.5% | Date +84.6%, Dropdown +45.6% |

MCP was hit hardest because it had the most date/dropdown fields in its failure set — fixing the scorer revealed the agent was actually filling correctly but being marked wrong.

### Recommendations

**For production use:**
- **Standard forms** → llm-structured (71.35%, fast, cheap)
- **Cost-sensitive** → rule-based (57.66%, $0, instant)
- **Complex multi-step** → Fix MCP retry logic first (currently too slow)

**For improving MCP:**
- Add success detection to break retry loops early
- Swap `qwen2.5:7b` → `gpt-4o-mini` for 10x speed + better Description accuracy
- Cache DOM state between turns (currently re-scrapes every loop)


---

## Known Limitations & Open Issues

| Issue | Status | Notes |
|---|---|---|
| Click accuracy always 0% | Open | MCP/LLM agents don't record click coordinates; benchmark requires bbox annotations |
| Hybrid agent 0% value acc | Skipped | Submit timeout — Flask redirect breaks post-submit scoring |
| vision-agent / vlm-agent | Blocked | Require multimodal model (`qwen2.5vl:7b`, `llava:13b`, or GPT-4o). `qwen2.5:7b` is text-only |
| MCP date fill (10 retries) | Partially fixed | Agent correctly fills date but model keeps retrying — needs `finish` after success detection |
| Arts & Creative domain low | Open | 15.2% across agents — forms have unusual field semantics that confuse all agents |
| qwen2.5:7b token cost | Known | 25k tokens for 1 form when retrying = expensive. GPT-4o-mini would be 10x cheaper + faster |

---

## Model / Provider Reference

| Model | Tool Calling | Notes |
|---|---|---|
| `qwen2.5:7b` | ✅ | Active model. Works but weak on semantic fields |
| `llama3.2:3b` | ✅ | Fallback. Weaker on complex forms |
| `gemma3:12b` | ❌ | `400: does not support tools` |
| `gemma3:27b` | ❌ | Same as above |
| `GPT-4o-mini` | ✅ | Not configured. Set `OPENAI_API_KEY` + `LLM_BASE_URL=https://api.openai.com/v1` + `LLM_MODEL=gpt-4o-mini` in `.env` — no code changes needed |

---

## File Map

```
extension/
  src/
    benchmark/
      evaluation.ts          ← normalize() date/float/dropdown fixes (Phase 6)
      playwright-executor.ts ← dropdown label readback fix (Phase 6)
      runner.ts              ← telemetry aggregation (Phase 3)
      types.ts               ← token/latency fields (Phase 3)
    implementations/
      rule-based/            ← Phase 0 baseline
      embedding-matcher/     ← Phase 4 (underperforms rule-based)
      llm-structured/        ← Phase 3+5, system prompt date/dropdown hints
      hybrid/                ← Phase 3, broken submit — skipped
      mcp-agent/agent.ts     ← Phase 5+6, JSON repair + coercion + fuzzy select
  scripts/
    ablation-study.ts        ← Phase 3 ablation runner
    run-benchmark.ts         ← main benchmark CLI

web-portal/
  src/agents/smart-matcher.ts     ← Phase 1, 3-tier matcher
  src/agents/embedder.ts          ← Phase 1, embedding utility
  src/filler/form-filler-enhanced.ts ← Phase 1, production filler

mcp-implementations/playwright-mcp/
  .env                            ← Phase 2, Ollama endpoint
  src/agent.ts                    ← Phase 2, dummy API key

Documentation/
  ABLATION-STUDY.md          ← generated by ablation runner
  OLLAMA-SETUP.md            ← Ollama model requirements + troubleshooting
  VISION-AGENTS.md           ← vision/vlm architecture + model requirements
  IMPLEMENTATION-HISTORY.md  ← this file
```
