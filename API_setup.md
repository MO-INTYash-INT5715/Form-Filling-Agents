# API Setup Guide (MCP + Web Portal Focus)

This guide is the source of truth for switching LLM providers in the **MCP** and **web-portal** tracks of FFA.

---

## 1. Current state (important)

### MCP (`mcp-implementations/playwright-mcp`)
- Already supports **OpenAI-compatible endpoints** through:
  - `LLM_BASE_URL`
  - `LLM_MODEL`
  - `GITHUB_TOKEN` or `OPENAI_API_KEY` or `LLM_API_KEY`
- Main wiring: `mcp-implementations\playwright-mcp\src\agent.ts`
- Env template: `mcp-implementations\playwright-mcp\.env.example`

### Web portal (`web-portal`)
- `llm-structured` currently uses `OPENAI_API_KEY` only (no base URL override).
- `embedder` can use OpenAI key, else local deterministic embeddings.
- Main wiring:
  - `web-portal\src\agents\llm-structured.ts`
  - `web-portal\src\agents\embedder.ts`
- Env template: `web-portal\.env.example`

---

## 2. Standard env contract to support on-demand provider switching

Use this common contract in both MCP and web-portal:

```env
LLM_PROVIDER=openai   # openai | bedrock | gemini | ollama | local-openai-compatible
LLM_MODEL=gpt-4o-mini
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=

# Legacy compatibility (optional)
OPENAI_API_KEY=
GITHUB_TOKEN=

# Bedrock (if using native AWS SDK path)
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=

# Gemini (if using native SDK path)
GEMINI_API_KEY=
```

---

## 3. Provider switching matrix

| Provider mode | MCP changes | Web-portal changes | Notes |
|---|---|---|---|
| OpenAI | Env only | Needs baseURL/model env wiring if not already added | Easiest cloud default |
| Ollama / local OpenAI-compatible | Env only | Needs baseURL/model env wiring if not already added | No cloud key needed |
| Gemini | Prefer OpenAI-compatible gateway **or** native adapter | Needs adapter (or gateway) | Native Gemini API shape differs |
| AWS Bedrock | Prefer OpenAI-compatible gateway **or** native adapter | Needs adapter (or gateway) | Native Bedrock tool/response shape differs |

---

## 4. Fast path (recommended): OpenAI-compatible gateway for all providers

If you want true on-demand switching with minimal code churn, put all providers behind an OpenAI-compatible endpoint (for example a gateway/proxy). Then:

1. Keep callers using OpenAI SDK.
2. Switch only env:
   - `LLM_BASE_URL`
   - `LLM_API_KEY`
   - `LLM_MODEL`
3. No per-provider prompt/tool-calling rewrite needed.

This is the lowest-friction way to use **Bedrock**, **Gemini**, **OpenAI**, and **local models** in one interface.

---

## 5. Required code changes (web-portal) for real on-demand switching

These changes are required even before Bedrock/Gemini native adapters, because portal currently assumes `OPENAI_API_KEY` only.

## 5.1 `web-portal\src\agents\llm-structured.ts`
- Replace:
  - `const apiKey = process.env.OPENAI_API_KEY;`
  - `new OpenAI({ apiKey })`
- With provider-aware env:
  - `const baseURL = process.env.LLM_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';`
  - `const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;`
  - `const model = process.env.LLM_MODEL || 'gpt-4o-mini';`
  - `new OpenAI({ apiKey, baseURL })`

## 5.2 `web-portal\src\agents\embedder.ts`
- Same key/baseURL pattern for embeddings client.
- Add `LLM_EMBEDDING_MODEL` env support with fallback to `text-embedding-3-small`.

## 5.3 `web-portal\.env.example`
- Add:
```env
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=
LLM_MODEL=gpt-4o-mini
LLM_EMBEDDING_MODEL=text-embedding-3-small
```

---

## 6. Required code changes (MCP) to standardize with portal

`mcp-implementations\playwright-mcp\src\agent.ts` already supports base URL switching; only standardize priority order:

1. `LLM_API_KEY`
2. `OPENAI_API_KEY`
3. `GITHUB_TOKEN`
4. local dummy key for localhost

And keep:
- `LLM_BASE_URL`
- `LLM_MODEL`
- `MAX_TURNS_PER_FORM`

---

## 7. Bedrock setup options

## Option A (recommended): Bedrock via OpenAI-compatible gateway
1. Configure gateway with AWS credentials and Bedrock model mapping.
2. In `.env`:
```env
LLM_PROVIDER=bedrock
LLM_BASE_URL=<gateway_openai_base_url>
LLM_API_KEY=<gateway_key_if_required>
LLM_MODEL=<bedrock-mapped-model-id>



```
3. No additional MCP/web-portal code branching required.

## Option B: Native Bedrock integration (direct AWS SDK) - [COMPLETED]
1. Dependency added to package.json:
   - `@aws-sdk/client-bedrock-runtime`
2. Implemented native Bedrock handlers directly inside the structured and visual agents:
   - `mcp-implementations\playwright-mcp\src\agents\llm-structured.ts` (supports full Converse API tool-calling loop)
   - `web-portal\src\agents\llm-structured.ts`
   - `web-portal\src\agents\vlm-agent.ts` (supports visual inputs with screenshots)
   - `extension\src\utils\llm.ts` & `extension\src\implementations\llm-structured\agent.ts`
   - `extension\src\implementations\vlm-agent\agent.ts`
   - `extension\src\pipeline\data-parser.ts`
3. Map generic requests and tools directly to Bedrock Converse parameters, capturing token usage (`inputTokens` / `outputTokens`).
4. Configure in `.env`:
```env
LLM_PROVIDER=bedrock
AWS_REGION=ap-south-1
# AWS_ACCESS_KEY_ID=... (Omit or comment out to use default AWS profile)
# AWS_SECRET_ACCESS_KEY=...
# AWS_SESSION_TOKEN=...  # optional
LLM_MODEL=openai.gpt-oss-20b-1:0 # or any bedrock model ID
```

---

## 8. Gemini setup options

## Option A (recommended): Gemini via OpenAI-compatible gateway
Use same gateway pattern as Bedrock and switch only env values.

## Option B: Native Gemini SDK
1. Add dependency:
   - `@google/generative-ai`
2. Add provider adapters:
   - `mcp-implementations\playwright-mcp\src\llm\gemini.ts`
   - `web-portal\src\lib\llm\gemini.ts`
3. Map Gemini output/tool-calls into same common response type.
4. Add env:
```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=...
LLM_MODEL=gemini-1.5-flash
```

---

## 9. Ollama / local-hosted setup

For both MCP and web-portal (after portal env wiring is done):

```env
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen2.5:7b
LLM_API_KEY=ollama
```

Notes:
- MCP already handles localhost dummy key logic.
- For tool-calling workloads, choose models that support tool calling well.

---

## 10. OpenAI setup

```env
LLM_PROVIDER=openai
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=<openai_key>
LLM_MODEL=gpt-4o-mini
```

---

## 11. Operational runbook (switching on-demand)

1. Update env in:
   - `mcp-implementations\playwright-mcp\.env`
   - `web-portal\.env.local`
2. Restart processes:
   - MCP runs (`tsx src/index.ts ...`)
   - portal (`npm run portal:dev`)
3. Validate one smoke call on each track before benchmark runs.

---

## 12. Suggested next implementation milestone

Implement a shared provider abstraction used by both tracks:
- `chatCompletion(messages, tools, model)`
- `embeddings(texts, model)`
- normalized usage + error model

This gives true provider hot-swap with one code path and minimal regression risk.
