# LLM Structured Output Agent — Implementation

**Status:** 🔲 Planned

## Approach

Serializes the form's accessibility tree / DOM into compact text and sends it to an LLM with a strict JSON-schema output constraint:

1. `tree-serializer.ts` converts the form's `FormContext` (fields array) into a compact textual representation (ARIA tree or simplified HTML).
2. `schema-builder.ts` generates a JSON schema where each property corresponds to a detected `field.id` or `field.name`.
3. The LLM is called with the serialized tree + `UserProfile` + schema → the output is constrained to valid JSON matching the schema.
4. Response is directly usable as a `FieldValueMapping`.

## Files

| File | Purpose |
|------|---------|
| `agent.ts` | `LLMStructuredAgent` — implements `Agent` interface |
| `tree-serializer.ts` | Converts `FormContext` to compact text (ARIA / simplified HTML) |
| `schema-builder.ts` | Builds JSON schema from detected fields for constrained output |
| `README.md` | This file |

## Supported LLM Backends

| Backend | Mode | Notes |
|---------|------|-------|
| Ollama (local) | Local | Phi-3-mini, Llama-3.2-3B; no data leaves device |
| LM Studio | Local | Easy GUI-based model management |
| OpenAI (GPT-4o) | Cloud | Best accuracy; requires API key |
| Anthropic (Claude) | Cloud | Strong text reasoning; requires API key |

## Constrained Decoding

To guarantee valid structured output, use one of:
- **Ollama** `format: "json"` parameter with a schema prompt
- **`outlines`** library for local models
- **OpenAI** `response_format: { type: "json_schema", json_schema: ... }`
- **Anthropic** tool use with a strict schema

## Known Limitations

- Long forms may exceed context windows of small local models.
- Schema construction assumes each field has a unique `id` or `name`.
- Shadow DOM / iframe fields need explicit serialization support.

## Benchmark Results

> Run `npm run test:impl -- llm-structured` and paste results here.

| Backend | Click Accuracy | Value Accuracy | Form Completion | Latency |
|---------|---------------|----------------|-----------------|---------|
| Ollama (local) | — | — | — | — |
| GPT-4o | — | — | — | — |

## Imports Allowed

- `src/types/index.ts`
- `src/utils/form-detection.ts`

**Must NOT import from any other `src/implementations/*` folder.**
