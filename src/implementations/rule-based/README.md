# Rule-Based DOM Inference — Implementation

**Status:** ✅ Baseline (implemented — refactored from `src/agents/form-agents.ts`)

## Approach

Pure keyword / pattern matching on form field metadata extracted from the DOM:

- `field.name`, `field.id`, `field.label`, `field.placeholder` are lowercased and tested against a dictionary of canonical field keys (email, firstname, phone, …).
- No model, no network call — fully offline and instantaneous.
- `UserProfile` values are looked up by the matched canonical key.

## Files

| File | Purpose |
|------|---------|
| `agent.ts` | `RuleBasedAgent` — implements `Agent` interface |
| `patterns.ts` | Keyword dictionaries per canonical field type |
| `README.md` | This file |

## Known Limitations

- Fails on unlabeled inputs or non-English labels.
- Cannot handle visually grouped fields with no semantic HTML.
- No confidence scoring — either matches or does not.

## Benchmark Results

> Run `npm run test:impl -- rule-based` and paste results here.

| Metric | Value |
|--------|-------|
| Click Accuracy | — |
| Value Accuracy | — |
| Form Completion | — |

## Imports Allowed

- `src/types/index.ts`
- `src/utils/form-detection.ts`

**Must NOT import from any other `src/implementations/*` folder.**
