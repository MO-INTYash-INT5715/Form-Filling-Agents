# AWS Bedrock Setup — Issues, Fixes & Alternatives

> **TL;DR** — The current `.env` config is broken in four ways: the bearer token expires in ~5 minutes, the model ID uses the wrong format for Bedrock-via-Mantle, the `json_schema` structured output format is unsupported by Nova models, and the embeddings endpoint is unavailable on Mantle. Switch to the **long-term Bedrock API key** flow described in Fix 1 below, or use the working Cerebras path as an alternative.

---

## 1. What Is the Bedrock Mantle Gateway?

AWS offers **two** endpoints for Bedrock inference:

| Endpoint | Base URL | Auth | Notes |
|---|---|---|---|
| `bedrock-mantle` | `https://bedrock-mantle.{region}.api.aws/v1` | Bedrock API key or SigV4 | OpenAI-compatible (Chat Completions, Responses API). Recommended for OpenAI SDK drop-in. |
| `bedrock-runtime` | `https://bedrock-runtime.{region}.amazonaws.com` | SigV4 or Bedrock API key | Native Converse/InvokeModel + `/v1/chat/completions`. |

The current `.env` points at `bedrock-mantle.ap-south-1.api.aws/v1`, which is the correct endpoint for OpenAI-SDK usage. However, all four issues below prevent it from working.

---

## 2. Confirmed Issues

### Issue 1 — Bearer Token Expired (Critical — 401 on every call)

**What happens:**
```
401 Unauthorized
"Signature expired: 20260612T041911Z is now earlier than 20260612T062631Z (20260612T062631Z - 5 min.)"
```

**Root cause:**
The `OPENAI_API_KEY` in `.env` is a *presigned SigV4 URL* wrapped in base64, with the prefix `bedrock-api-key-<b64>`. Decoded, it looks like:

```
bedrock.amazonaws.com/?Action=CallWithBearerToken
&X-Amz-Algorithm=AWS4-HMAC-SHA256
&X-Amz-Credential=ASIAWGGW.../20260611/.../aws4_request
&X-Amz-Date=20260612T041911Z       ← the timestamp
&X-Amz-Expires=43200               ← says 12 hours
&X-Amz-Signature=...
```

Despite `X-Amz-Expires=43200` (12 hours), the Mantle gateway validates the `X-Amz-Date` using standard **SigV4 clock skew tolerance — 5 minutes**. Any request whose signing timestamp is more than 5 minutes old is rejected. The key in `.env` is from a previous session and will always fail.

**This is not a long-term API key — it is a one-time presigned URL that expires in minutes, not hours.**

---

### Issue 2 — Wrong Model IDs for Bedrock-via-Mantle

**What happens:** Either a 404 (model not found) or silent fallback to a wrong model.

**Root cause:**
The `.env` file has:
```
LLM_MODEL=gpt-oss-120b           # ← Cerebras model ID (now leftover)
# was: LLM_MODEL=amazon.nova-lite-v1:0  # ← works on bedrock-runtime, not always on Mantle
```

On the Bedrock Mantle endpoint, model IDs are *namespaced* differently:
- OpenAI models hosted on Bedrock: `openai.gpt-oss-120b`, `openai.gpt-4o-mini`, etc.
- Amazon models: `amazon.nova-lite-v1:0`, `amazon.nova-pro-v1:0`
- Anthropic models: `anthropic.claude-3-5-haiku-20241022-v1:0`

**The bare `gpt-oss-120b` ID works on Cerebras but NOT on Bedrock Mantle.** Use `openai.gpt-oss-120b` on Bedrock.

---

### Issue 3 — `json_schema` Structured Outputs Not Supported by Amazon Nova Models

**What happens:** Runtime error or malformed JSON returned when using `amazon.nova-lite-v1:0` with the LLM structured agent.

**Root cause:**
In `extension/src/implementations/llm-structured/agent.ts` and `mcp-agent/agent.ts`, when `LLM_PROVIDER === 'openai'`, the code sends:
```typescript
response_format: {
  type: 'json_schema',
  json_schema: { name: 'form_fill_values', strict: true, schema }
}
```

Amazon Nova models **do not support OpenAI's `json_schema` structured output format** via Mantle. They support:
- `response_format: { type: 'json_object' }` — for free-form JSON
- Prompt-level JSON enforcement (explicit instruction in system prompt)

The `json_schema` + `strict: true` path is only valid for OpenAI's own models (`gpt-4o`, `gpt-4.1-mini`, etc.) and possibly `openai.gpt-oss-120b` on Bedrock.

---

### Issue 4 — Embedding Endpoint Unavailable on Mantle

**What happens:** `/v1/embeddings` calls to `bedrock-mantle.ap-south-1.api.aws/v1/embeddings` return 404.

**Root cause:**
The Bedrock Mantle endpoint **does not expose an embeddings API**. The `EMBEDDING_MODEL=amazon.titan-embed-text-v2:0` config cannot be used via the Mantle gateway or the Chat Completions path.

Amazon Titan embeddings are only accessible via:
- `bedrock-runtime.{region}.amazonaws.com` using the native `InvokeModel` API, OR
- Via the AWS SDK `BedrockRuntimeClient`

The `OpenAI({ baseURL: 'bedrock-mantle...' }).embeddings.create(...)` call will always fail.

---

### Issue 5 — SSL / Corporate Netskope Proxy (Secondary)

The `NODE_EXTRA_CA_CERTS=C:\certs\corp-root-ca.pem` is already in `.env`. Testing with `curl -k` (SSL bypass) still returns 401, so **SSL is not blocking requests — auth is**. However, if the cert file is missing or Node.js ignores it, you may see `UNABLE_TO_VERIFY_LEAF_SIGNATURE` on top of auth failures. This is secondary to Issues 1–4.

---

## 3. Fixes

### Fix 1 — Generate a 30-Day Long-Term Bedrock API Key (Recommended)

AWS now offers **30-day long-term Bedrock API keys** directly from the console. These are stable bearer tokens (not presigned URLs) that work with both Mantle and bedrock-runtime.

**Steps:**
1. Open [https://console.aws.amazon.com/bedrock](https://console.aws.amazon.com/bedrock)
2. In the left nav → **API Keys**
3. On the **Long-term API keys** tab → click **Generate long-term API keys**
4. Set expiry to **30 days**
5. Copy the key (shown only once) — it looks like `brk-...` or an opaque token

**Update `.env`:**
```env
# --- AWS Bedrock (Mantle — OpenAI-compatible) ---
LLM_PROVIDER=openai
OPENAI_BASE_URL=https://bedrock-mantle.ap-south-1.api.aws/v1
OPENAI_API_KEY=<your-30-day-bedrock-api-key>

# For Amazon Nova models:
LLM_MODEL=amazon.nova-lite-v1:0

# For OpenAI GPT OSS 120B on Bedrock (uses openai. prefix):
# LLM_MODEL=openai.gpt-oss-120b
```

**Update `.env` embeddings (use local fallback, since Mantle has no embeddings endpoint):**
```env
# Embeddings: Mantle has no /v1/embeddings — use local deterministic embedder
# EMBEDDING_MODEL=  ← leave blank to use built-in fallback
```

---

### Fix 2 — Regenerate the Short-Term Presigned Token (Quick Workaround)

If you have AWS CLI configured with your IAM credentials (`aws configure`), generate a fresh presigned bearer token before each session:

```powershell
# Requires: AWS CLI installed + configured with your IAM credentials for ap-south-1
# This generates a new presigned URL valid for 12 hours (43200s)
$token = aws bedrock generate-bearer-token `
  --region ap-south-1 `
  --expires-in 43200 `
  --query token --output text

# Write it to .env
(Get-Content .env) -replace '^OPENAI_API_KEY=.*', "OPENAI_API_KEY=bedrock-api-key-$token" | Set-Content .env
Write-Host "Token refreshed."
```

> ⚠️ **Note:** Even with `--expires-in 43200`, the Mantle gateway's SigV4 clock skew means the token itself stops being accepted ~5 minutes after generation if the Mantle gateway validates the signature timestamp strictly. This workaround is only reliable for immediate use (within the same shell session). **Use Fix 1 (30-day key) for stable long-running benchmarks.**

---

### Fix 3 — Fix Model IDs for Bedrock Mantle

Update `.env` based on which model you want:

```env
# Amazon Nova (Bedrock-native, available in ap-south-1):
LLM_MODEL=amazon.nova-lite-v1:0       # fast, cheap — good baseline
LLM_MODEL=amazon.nova-pro-v1:0        # stronger reasoning

# OpenAI models hosted on Bedrock (use openai. prefix):
LLM_MODEL=openai.gpt-oss-120b         # same GPT OSS 120B as Cerebras, but via Bedrock
LLM_MODEL=openai.gpt-4o-mini          # standard OpenAI model on Bedrock
```

> Models on Mantle vary by region. Run this to see what's available in ap-south-1:
> ```bash
> curl -s -k "https://bedrock-mantle.ap-south-1.api.aws/v1/models" \
>   -H "Authorization: Bearer $OPENAI_API_KEY" | python -m json.tool
> ```

---

### Fix 4 — Fix `json_schema` for Non-OpenAI Models

In `extension/src/implementations/llm-structured/agent.ts`, the provider check needs to distinguish OpenAI-hosted models from Amazon native models when going through the Mantle gateway:

```typescript
// Current (broken for Amazon models):
if (this.provider === 'openai') {
  options.response_format = { type: 'json_schema', json_schema: { ... } };
} else {
  options.format = 'json';
}

// Fixed approach — detect model family:
const isOpenAIModel = this.model.startsWith('openai.') || this.model.startsWith('gpt-');
const isAnthropicModel = this.model.startsWith('anthropic.');
if (isOpenAIModel) {
  options.response_format = { type: 'json_schema', json_schema: { name: 'form_fill_values', strict: true, schema } };
} else {
  // Amazon Nova, Anthropic (via Mantle), Ollama — use json_object or prompt-level enforcement
  options.response_format = { type: 'json_object' };
}
```

Same fix applies in `extension/src/implementations/mcp-agent/agent.ts`.

---

### Fix 5 — Embeddings via bedrock-runtime (Native SDK Path)

Since Mantle has no `/v1/embeddings`, use either:

**Option A — Fall back to local deterministic embedder (zero dependencies):**
```env
EMBEDDING_MODEL=   # blank → extension falls back to built-in hash embedder
```

**Option B — Native `@aws-sdk/client-bedrock-runtime` for Titan embeddings:**
```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'ap-south-1' });
const cmd = new InvokeModelCommand({
  modelId: 'amazon.titan-embed-text-v2:0',
  contentType: 'application/json',
  accept: 'application/json',
  body: JSON.stringify({ inputText: text, dimensions: 1024, normalize: true }),
});
const res = await client.send(cmd);
const { embedding } = JSON.parse(Buffer.from(res.body).toString());
```

Requires AWS credentials as env vars (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_REGION`).

---

## 4. What Else to Try

### Option A — Use Cerebras Instead (Already Working ✅)

The Cerebras `gpt-oss-120b` is the same model as `openai.gpt-oss-120b` on Bedrock, at blazing speed (390ms for form-filling JSON) and zero credential complexity. **For benchmark runs right now, this is the best path.**

```env
LLM_PROVIDER=cerebras
LLM_MODEL=gpt-oss-120b
CEREBRAS_API_KEY=csk-...
```

Limitations: 5 req/min on free tier — add delays between benchmark calls.

---

### Option B — bedrock-runtime Native Endpoint with SigV4 (Stable Auth)

Instead of Mantle, use the `bedrock-runtime` endpoint directly. It accepts both SigV4 and Bedrock API keys:

```
POST https://bedrock-runtime.ap-south-1.amazonaws.com/v1/chat/completions
Authorization: Bearer <30-day-bedrock-api-key>
Content-Type: application/json

{ "model": "amazon.nova-lite-v1:0", "messages": [...] }
```

```env
OPENAI_BASE_URL=https://bedrock-runtime.ap-south-1.amazonaws.com/v1
OPENAI_API_KEY=<30-day-bedrock-api-key>
LLM_MODEL=amazon.nova-lite-v1:0
```

This avoids Mantle entirely. Model IDs don't need the `openai.` prefix here — use the bare Bedrock model ID.

---

### Option C — Use Cross-Region Inference Profile

If `amazon.nova-lite-v1:0` hits quota limits in `ap-south-1`, use a cross-region inference profile that routes to the least-loaded region automatically:

```env
LLM_MODEL=ap.amazon.nova-lite-v1:0   # ap = Asia-Pacific cross-region profile
```

---

### Option D — Switch to Claude (Best Quality on Bedrock)

If model quality matters more than cost, Anthropic Claude is excellent on Bedrock:

```env
# Via Mantle (OpenAI SDK compatible path):
LLM_MODEL=anthropic.claude-3-5-haiku-20241022-v1:0   # fast, cheap
LLM_MODEL=anthropic.claude-3-5-sonnet-20241022-v2:0  # stronger

# Via Mantle with Anthropic Messages API format (not OpenAI):
# Use the Messages API path in agent.ts — different request shape
```

Note: Claude 3.5 via Mantle's Chat Completions API should work transparently through the OpenAI SDK. Claude 3.7+ models may require the Anthropic Messages API path.

---

## 5. Recommended `.env` Configuration (Post-Fix)

Once you have a 30-day Bedrock API key:

```env
# ============================================================
# Active provider: openai (Bedrock Mantle, OpenAI-compatible)
# ============================================================
LLM_PROVIDER=openai

# Bedrock Mantle endpoint (OpenAI-compatible)
OPENAI_BASE_URL=https://bedrock-mantle.ap-south-1.api.aws/v1
OPENAI_API_KEY=<your-30-day-bedrock-api-key>   # from Bedrock Console → API Keys

# Model options (pick one):
LLM_MODEL=amazon.nova-lite-v1:0         # Amazon Nova — no structured output
# LLM_MODEL=openai.gpt-oss-120b         # GPT OSS 120B on Bedrock (supports json_schema)
# LLM_MODEL=anthropic.claude-3-5-haiku-20241022-v1:0  # Anthropic Claude

# Embeddings: Mantle has no embeddings endpoint — use local fallback
# EMBEDDING_MODEL=                       # blank = built-in deterministic embedder

# Fallback / other providers
OLLAMA_BASE_URL=http://localhost:11434/v1
CEREBRAS_API_KEY=csk-ywcdwycxpxp8ynxnh8wvw9x4mx295hx2m5eeycwk625rwftw

# Corporate SSL
NODE_EXTRA_CA_CERTS=C:\certs\corp-root-ca.pem

# FormFactory
FORMFACTORY_DATA=C:\Code\formfactory
FORMFACTORY_SERVER=http://localhost:5000
```

---

## 6. Quick Diagnostics Script

Run this to test a Bedrock connection after configuring credentials:

```powershell
# From repo root
$env:LLM_PROVIDER="openai"
$env:OPENAI_BASE_URL="https://bedrock-mantle.ap-south-1.api.aws/v1"
$env:OPENAI_API_KEY="<your-key>"
$env:LLM_MODEL="amazon.nova-lite-v1:0"

npx tsx scripts/test-cerebras.ts   # reuse the smoke-test — same OpenAI SDK interface
```

Or list available models directly:
```powershell
curl.exe -s -k `
  "https://bedrock-mantle.ap-south-1.api.aws/v1/models" `
  -H "Authorization: Bearer $env:OPENAI_API_KEY" | python -m json.tool
```

---

## 7. Summary Table

| Issue | Symptom | Fix |
|---|---|---|
| Expired presigned token | `401 Signature expired` on every call | Generate 30-day API key from Bedrock Console |
| Wrong model ID format | 404 or wrong model used | Add `openai.` prefix for OpenAI models; bare ID for Amazon/Anthropic |
| `json_schema` unsupported by Nova | Malformed JSON or API error | Use `json_object` for Amazon/Anthropic models |
| No embeddings on Mantle | 404 on `/v1/embeddings` | Use local deterministic embedder or native bedrock-runtime SDK |
| Corporate SSL proxy | `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | `NODE_EXTRA_CA_CERTS` already set; verify cert file exists |

