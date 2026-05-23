# Embedding Matcher (IMPL-2)

This implementation provides a lightweight embedding-based semantic matcher for mapping form field labels to candidate values extracted from input documents.
# Embedding Matcher (IMPL-2)

This implementation provides a lightweight embedding-based semantic matcher for mapping form field labels to candidate values extracted from input documents.

Key features
- Pluggable provider: uses OpenAI embeddings when `OPENAI_API_KEY` is present, otherwise falls back to a deterministic local embedder.
- `EmbeddingMatcherAgent` implements a `planActions(instance)` method compatible with the benchmark runner.
 
Usage
1. (Optional) Set `OPENAI_API_KEY` in your environment for better embeddings.
2. To test locally, temporarily swap the agent used in `scripts/run-benchmark.ts` to `EmbeddingMatcherAgent`.

Environment variables
- `OPENAI_API_KEY` — optional, used when present and provider is not forced to `local`.
- `OPENAI_EMBEDDING_MODEL` — optional, defaults to `text-embedding-3-small` in the embedder.
 
Notes
- The embedder implementation is intentionally lightweight and deterministic when OpenAI is not available. For production-quality embeddings, install the `openai` package and provide an API key.
 
Quick usage
1. By default the embedder will run in `auto` mode: it uses the OpenAI provider when `OPENAI_API_KEY` is present in the environment, otherwise it falls back to the local deterministic embedder.
2. To test the agent locally, temporarily swap the agent used in `scripts/run-benchmark.ts` to `EmbeddingMatcherAgent` (see agent import in that script).

Where to set the API key

The embedder looks for `OPENAI_API_KEY` in the process environment. When you obtain an API key, set it in your environment and the embedder will automatically prefer OpenAI (unless you force `local` provider via config).

Examples:

- macOS / Linux (temporary for the shell session):

```bash
export OPENAI_API_KEY="sk-..."
export OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
```

- Windows (cmd.exe temporary):

```cmd
set OPENAI_API_KEY=sk-...
set OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

- PowerShell (temporary):

```powershell
#$env:OPENAI_API_KEY = "sk-..."
#$env:OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
```

Note: to persist the key across sessions, use your OS-specific persistent env var settings, or store the key in a `.env` file and load it in your run environment (e.g., via `dotenv`) — do NOT commit secrets to version control.

For programmatic control (override provider or model at runtime), call the embedder configuration function before running the agent:

```ts
import embedder from '../../src/implementations/embedding-matcher/embedder';

// Force OpenAI usage (will still require OPENAI_API_KEY to succeed)
embedder.setEmbeddingConfig({ provider: 'openai', openaiModel: 'text-embedding-3-small' });

// Or force local deterministic embeddings
embedder.setEmbeddingConfig({ provider: 'local', localDim: 32 });
```

Dependencies and notes

- If you plan to use OpenAI embeddings, install the official `openai` package:

```bash
npm install openai
```

- The embedder is intentionally pluggable so you don't need the `openai` package during early development — the code falls back to a local deterministic embedding function when no key or package is present.

- When no `OPENAI_API_KEY` is set, the system will run deterministically using the local embedder. This is ideal for tests and quick iteration.

Security

- Always keep API keys out of version control. Use environment variables, secrets managers, or a secure model proxy for production.
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
