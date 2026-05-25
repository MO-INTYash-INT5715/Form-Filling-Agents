# Implementation Plan — Form Filling Agent

Last updated: 2026-05-21
See [Flow.md](Flow.md) for the complete pipeline diagram.

---

## Purpose

Actionable engineering checklist for building, isolating, and comparing every form-filling strategy against the FormFactory benchmark. Each strategy lives in its own folder — zero code overlap between implementations.

---

## Guiding Principles

1. **Isolation** — every `src/implementations/<name>/` folder is self-contained. It may only import from `src/types/` and `src/utils/`. No cross-implementation imports.
2. **Shared contract** — all agents implement the same `Agent` interface (`name`, `analyze()`, `isApplicable()`).
3. **Same benchmark** — all implementations are evaluated on the identical FormFactory harness (`src/benchmark/`). Results land in `benchmark-results/<name>/`.
4. **Input Pipeline decoupled** — `UserProfile` JSON is the only input agents receive. The parser that produces it is swappable without touching agents.

---

## Implementation Tracker

| # | Name | Folder | Status |
|---|------|--------|--------|
| 1 | Rule-Based DOM Inference | `src/implementations/rule-based/` | ✅ Baseline |
| 2 | Embedding / Semantic Matcher | `src/implementations/embedding-matcher/` | ✅ Implemented |
| 3 | VLM / Multimodal Agent | `src/implementations/vlm-agent/` | ✅ Implemented |
| 4 | LLM Structured Output Agent | `src/implementations/llm-structured/` | ✅ Implemented |
| 5 | Hybrid (DOM + VLM Fallback) | `src/implementations/hybrid/` | ✅ Implemented |

---

## Task Checklist

### Phase 0 — Foundation & Restructuring

- [x] Create `src/implementations/` directory
- [x] Move existing agent code → `src/implementations/rule-based/agent.ts`
- [x] Extract keyword patterns → `src/implementations/rule-based/patterns.ts`
- [x] Add `UserProfile` type to `src/types/index.ts`
- [x] Wire `UserProfile` into `Agent.analyze()` signature
- [x] Create `benchmark-results/` sub-folders per implementation
- [x] Add per-implementation npm benchmark scripts (e.g. `test:impl -- rule-based`)

### Phase 1 — Input Pipeline (Stub → Real)

- [x] Define `UserProfile` JSON schema in `src/types/index.ts`
- [x] Create `src/utils/input-pipeline.ts` stub that returns a hardcoded profile
- [x] Document extension points for future parsers (PDF, resume, clipboard)
- [x] Add consent/PII redaction hook in pipeline stub

### Phase 2 — [IMPL-1] Rule-Based DOM Inference  *(refactor from existing)*

- [x] Create `src/implementations/rule-based/`
- [x] `agent.ts` — implements `Agent` interface, consumes `UserProfile`
- [x] `patterns.ts` — keyword dictionaries (email, name, company, address, …)
- [x] `README.md` — describes approach, known limitations
- [x] Run baseline benchmark → save to `benchmark-results/rule-based/`

### Phase 3 — [IMPL-2] Embedding / Semantic Matcher

- [x] Create `src/implementations/embedding-matcher/`
- [x] `embedder.ts` — wraps a local embedding model (e.g. Transformers.js, `all-MiniLM-L6-v2`)
- [x] `agent.ts` — encodes field labels + profile keys, cosine-similarity match
- [x] `README.md` — model choice rationale, performance notes
- [x] Run benchmark → save to `benchmark-results/embedding-matcher/`

### Phase 4 — [IMPL-3] VLM / Multimodal Agent

- [x] Create `src/implementations/vlm-agent/`
- [x] `screenshot.ts` — captures visible form region via `html2canvas` or Chrome tab capture API
- [x] `ruler.ts` — overlays pixel-scale ruler markers (FormFactory §4.2 strategy)
- [x] `agent.ts` — sends screenshot + form schema to VLM API (GPT-4o / Gemini / Qwen-VL); parses structured JSON response
- [x] `README.md` — API keys required, privacy notice, ruler usage
- [x] Run benchmark (with and without ruler) → save to `benchmark-results/vlm-agent/`

### Phase 5 — [IMPL-4] LLM Structured Output Agent

- [x] Create `src/implementations/llm-structured/`
- [x] `tree-serializer.ts` — serializes accessibility tree / DOM to compact text representation
- [x] `schema-builder.ts` — generates JSON schema for constrained output (field-id → value)
- [x] `agent.ts` — calls local (Ollama / LM Studio) or cloud LLM with schema-enforced output
- [x] `README.md` — model options, constrained decoding setup, latency tradeoffs
- [x] Run benchmark → save to `benchmark-results/llm-structured/`

### Phase 6 — [IMPL-5] Hybrid (DOM + VLM Fallback)

- [x] Create `src/implementations/hybrid/`
- [x] `confidence.ts` — computes per-field confidence score from rule-based pass
- [x] `agent.ts` — runs IMPL-1 first; for fields below confidence threshold, escalates to IMPL-3 (VLM)
- [x] `README.md` — confidence threshold tuning, expected latency profile
- [x] Run benchmark → save to `benchmark-results/hybrid/`

### Phase 7 — Comparative Analysis

- [/] Collect all `benchmark-results/*/` JSON reports
- [ ] Update comparison matrix in `Documentation/Flow.md` §6 with real numbers
- [ ] Generate HTML report via `benchmark-analyzer.ts`
- [ ] Identify best implementation per metric (click acc, value acc, speed, privacy)
- [ ] Write `Documentation/Report.md` final analysis section

---

## Literature & Architecture Notes

### CLI / Local LLMs
- A small quantized model (3B class, e.g. Phi-3-mini, Llama-3.2) can emit structured tool calls from a compact context (form schema + user profile). Benefits: low latency, offline, low cost. Tradeoffs: less robust on ambiguous layouts.
- Use constrained decoding or schema enforcement (`outlines`, `lm-format-enforcer`) to guarantee valid JSON output.

### Framework Choices
- **PlaywrightMCP** — good for dataset creation and headless snapshot generation. Launches its own browser.
- **BrowserMCP** — attaches to an existing Chrome tab via CDP. Best for extension-driven, authenticated fills.
- **Skyvern** — full orchestration + anti-bot tooling; useful for complex multi-page workflows.

### Production Risks (address early)
1. **Bot detection** (CAPTCHAs, Cloudflare) — scope limitations or human-in-loop.
2. **Dynamic / conditional forms** — re-snapshot the accessibility tree after each action.
3. **PII / privacy** — redact sensitive fields before sending to cloud models; prefer local models.
4. **Shadow DOM / iframes** — extend `form-detection.ts` to pierce shadow roots.

---

## Verification Plan

### Per-Implementation Automated Tests
```bash
# Quick sanity benchmark on a specific implementation
npm run test:impl -- rule-based

# Full FormFactory benchmark (all 1,250 instances) on a specific implementation
npm run test:full -- rule-based

# Compare all implementations side-by-side
npm run test:compare
```

### Benchmark Metrics to Gate On
| Metric | Minimum bar to ship implementation |
|--------|------------------------------------|
| Click Accuracy | ≥ 5% (above zero-shot VLM baseline) |
| Value Accuracy | ≥ 50% |
| Form Completion | ≥ 10% |

### Manual Verification
- Load extension in Chrome (Developer Mode, unpacked from `public/`)
- Navigate to a real form (LinkedIn, Google Forms, Typeform)
- Trigger fill, inspect console for errors and `FillingResult`

---

## References

- FormFactory Paper: https://arxiv.org/abs/2506.01520
- Pipeline diagram: [Flow.md](Flow.md)
- Benchmark docs: `src/benchmark/README.md`
- Architecture report: [Report.md](Report.md)
- Testing guide: [TESTING.md](TESTING.md)
