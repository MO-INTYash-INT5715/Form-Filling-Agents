# Hybrid Agent (DOM + VLM Fallback) — Implementation

**Status:** 🔲 Planned

## Approach

Runs the Rule-Based DOM agent first for speed and privacy, then escalates to a VLM only for fields that remain unfilled or score below a confidence threshold:

1. Run IMPL-1 (Rule-Based) pass → get initial `FieldValueMapping` + per-field confidence scores.
2. Identify "uncertain" fields: those with `confidence < threshold` or empty mappings.
3. For uncertain fields only, capture a cropped screenshot and call the VLM (IMPL-3 approach).
4. Merge VLM results with rule-based results; VLM wins on conflict.

## Files

| File | Purpose |
|------|---------|
| `agent.ts` | `HybridAgent` — implements `Agent` interface |
| `confidence.ts` | Per-field confidence scoring for rule-based pass |
| `README.md` | This file |

## Design Rationale

| Property | Rule-Based Alone | VLM Alone | Hybrid |
|----------|-----------------|-----------|--------|
| Speed | ✅ Fast | ❌ Slow | 🔶 Fast for easy fields |
| Privacy | ✅ Local | ❌ Cloud | 🔶 Cloud only for hard fields |
| Coverage | ❌ Misses unlabeled | ✅ High | ✅ High |
| Cost | ✅ Free | ❌ API cost | 🔶 Minimal API cost |

## Confidence Thresholds

Default thresholds (tunable via config):

```typescript
const DEFAULT_CONFIG = {
  confidenceThreshold: 0.6,  // below → escalate to VLM
  maxVlmFields: 10,           // cap VLM calls per form
};
```

## Known Limitations

- Confidence scoring heuristics need calibration per domain.
- VLM escalation introduces latency spikes for complex forms.
- Privacy guarantee weakened if many fields require VLM fallback.

## Benchmark Results

> Run `npm run test:impl -- hybrid` and paste results here.

| Scenario | Click Accuracy | Value Accuracy | Form Completion | VLM Calls/Form |
|----------|---------------|----------------|-----------------|----------------|
| threshold=0.8 | — | — | — | — |
| threshold=0.6 | — | — | — | — |
| threshold=0.4 | — | — | — | — |

## Imports Allowed

- `src/types/index.ts`
- `src/utils/form-detection.ts`

**Must NOT import from any other `src/implementations/*` folder.**

> Note: The Hybrid agent re-implements the relevant logic from rule-based and VLM internally — it does not import from those sibling folders.
