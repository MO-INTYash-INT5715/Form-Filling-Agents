# VLM / Multimodal Agent — Implementation

**Status:** 🔲 Planned

## Approach

Takes a screenshot of the visible form and sends it to a Vision-Language Model (VLM) to identify fields and determine values:

1. Capture the form viewport as a base64 PNG (using Chrome's `captureVisibleTab` API or `html2canvas`).
2. Optionally overlay a pixel-scale **ruler** along the form edges (FormFactory §4.2 Ruler-Enhanced Strategy) to improve spatial grounding.
3. Pass screenshot + compact DOM field list + `UserProfile` to VLM (GPT-4o / Gemini 2.5 / Qwen-VL-Max).
4. Parse the structured JSON response → `FieldValueMapping`.

## Files

| File | Purpose |
|------|---------|
| `agent.ts` | `VLMAgent` — implements `Agent` interface |
| `screenshot.ts` | Captures the form viewport |
| `ruler.ts` | Draws pixel-scale ruler overlay for spatial grounding |
| `README.md` | This file |

## Supported VLM Backends

| Backend | Notes |
|---------|-------|
| GPT-4o | Best general accuracy; requires OpenAI API key |
| Gemini 2.5 Pro | High value accuracy; requires Google API key |
| Qwen-VL-Max | Good spatial accuracy; requires Alibaba API key |
| Claude 3.7 Sonnet | Text accuracy strong; click accuracy low (per paper) |

## Privacy Notice

⚠️ **Screenshots may contain PII.** This implementation requires explicit user opt-in before sending any image to a cloud API.

## Ruler-Enhanced Strategy

From FormFactory §4.2 — overlaying a ruler improves click accuracy by ~5–10% on simple forms. Enable via config:

```typescript
const agent = new VLMAgent({ useRuler: true, rulerScale: 1.0 });
```

## Benchmark Results

> Run `npm run test:impl -- vlm-agent` and paste results here.

| Scenario | Click Accuracy | Value Accuracy | Form Completion |
|----------|---------------|----------------|-----------------|
| No ruler | — | — | — |
| With ruler | — | — | — |

## Imports Allowed

- `src/types/index.ts`
- `src/utils/form-detection.ts`

**Must NOT import from any other `src/implementations/*` folder.**
