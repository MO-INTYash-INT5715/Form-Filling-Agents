# Embedding / Semantic Matcher — Implementation

**Status:** 🔲 Planned

## Approach

Uses dense vector embeddings to match form field labels against `UserProfile` keys:

1. Encode each `field.label` (or name/placeholder) with a local embedding model (e.g. `all-MiniLM-L6-v2` via Transformers.js).
2. Encode each `UserProfile` key-description pair.
3. Compute cosine similarity; assign the profile value whose key is most similar to the field label.
4. Apply a threshold to skip low-confidence matches.

## Files

| File | Purpose |
|------|---------|
| `agent.ts` | `EmbeddingMatcherAgent` — implements `Agent` interface |
| `embedder.ts` | Loads the embedding model and computes vectors |
| `README.md` | This file |

## Dependencies

- `@xenova/transformers` (Transformers.js) — runs ONNX models in-browser / Node.js
- Model: `Xenova/all-MiniLM-L6-v2` (22 MB, fully local)

## Known Limitations

- First-run model download adds latency.
- Struggles with highly domain-specific jargon not in training data.
- Requires a GPU or WASM backend for reasonable speed.

## Benchmark Results

> Run `npm run test:impl -- embedding-matcher` and paste results here.

| Metric | Value |
|--------|-------|
| Click Accuracy | — |
| Value Accuracy | — |
| Form Completion | — |

## Imports Allowed

- `src/types/index.ts`
- `src/utils/form-detection.ts`

**Must NOT import from any other `src/implementations/*` folder.**
