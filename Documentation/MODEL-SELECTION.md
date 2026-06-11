# Model Selection & How to Change Models

This document explains how to choose and change LLM models for ablation runs. The repo enforces a conservative guard for Bedrock models by default (only models with parameter counts in the 10–30B range are allowed) to prevent accidentally using very large or expensive models during sweeps.

Quick rules
- The active model is controlled by the env var `LLM_MODEL` (or per-track .env files).
- For Bedrock, the model string MUST include a parameter-size token such as `13b` (e.g. `my-model-13b`) so the guard can parse and validate it.
- The default guard range is 10–30B. To change this behavior, edit `shared/provider-utils.ts`.

How to change the model (examples)
1) Edit the repo root `.env` (recommended for persistent runs):

```
LLM_PROVIDER=bedrock
LLM_MODEL=my-bedrock-model-13b
LLM_BASE_URL=https://bedrock-gateway.example.com/v1
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

2) Or override on the command line for a single run:

```
LLM_PROVIDER=bedrock LLM_MODEL=my-bedrock-model-13b npx tsx extension/scripts/ablation-study.ts --quick
```

3) If your model identifier does not include a numeric `b` suffix (e.g. `gpt-4o-mini`), the repo's guard cannot infer parameter count — either use a model identifier that includes `13b`/`12b` etc., or update `shared/provider-utils.ts` to add a whitelist entry.

Updating cost/pricing
- To add provider-model pricing, edit `shared/cost-model.ts` and add a key in the form `"provider:model": { in: <USD per 1M in>, out: <USD per 1M out> }`.

Adjusting the allowed range
- The guard range (default 10–30B) lives in `shared/provider-utils.ts` (validateModelChoice()). Change the call sites in the benchmark scripts if you want different per-run ranges.

Troubleshooting
- If a benchmark aborts with "Model validation failed", confirm `LLM_PROVIDER` and `LLM_MODEL` are set and that the model string includes the parameter-count token (e.g. "13b").
- To bypass the guard for development only, you may temporarily set `LLM_PROVIDER=ollama` or adjust `shared/provider-utils.ts` (not recommended for production runs).

