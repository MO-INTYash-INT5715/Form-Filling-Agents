# Ollama Setup for MCP Form Filling

**Status:** ✅ Working  
**Date:** 2026-05-28  
**Model:** qwen2.5:7b (4.7 GB, supports tool calling)

## Summary

The MCP form filler now supports **local Ollama models** as an alternative to GitHub Models or OpenAI API. This eliminates external API dependencies and costs during development.

**Test Results:**
- ✅ **Success rate:** 100% (12/12 fields filled on httpbin.org)
- ⏱️ **Duration:** 59 seconds (vs 1.9s for web-portal direct approach)
- 🔧 **Tool calls:** 12 (Playwright MCP browser automation)
- 📊 **Token usage:** 46,645 in / 474 out

## Installation

### 1. Verify Ollama is Running

```bash
ollama --version  # Should show v0.12.11 or later
curl http://localhost:11434/api/tags  # Should return model list
```

### 2. Pull a Tool-Calling Model

```bash
# Recommended: qwen2.5:7b (4.7 GB, good performance)
ollama pull qwen2.5:7b

# Alternative: llama3.2:3b (2.0 GB, slower but smaller)
ollama pull llama3.2:3b
```

**Important:** Google Gemma models (gemma3:12b, gemma3:27b) do **NOT** support tool calling and will fail with `400 does not support tools` error.

### 3. Configure .env

Edit `mcp-implementations/playwright-mcp/.env`:

```bash
# Local Ollama (ACTIVE)
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen2.5:7b

# Max conversation turns per form fill attempt
MAX_TURNS_PER_FORM=20

# Browser to drive
MCP_BROWSER_CHANNEL=chrome
```

**No API key needed** for local Ollama — the agent automatically uses a dummy key for localhost endpoints.

## Testing

### Single Form Test

```bash
cd mcp-implementations/playwright-mcp

npx tsx src/index.ts fill \
  --url https://httpbin.org/forms/post \
  --profile ../shared/user-profile.json
```

Expected output:
```json
{
  "success": true,
  "fieldsAttempted": 12,
  "fieldsFilled": 12,
  "durationMs": 59214,
  "toolCalls": 12,
  "tokensIn": 46645,
  "tokensOut": 474
}
```

### Test GitHub Models / OpenAI API Connection

```bash
npx tsx test-github-models.ts
```

This verifies the LLM endpoint is reachable and supports tool calling.

## Switching to OpenAI API

When you get an OpenAI API key, update `.env`:

```bash
# OpenAI API (recommended for production)
OPENAI_API_KEY=sk-proj-...
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# Comment out or remove Ollama config:
# LLM_BASE_URL=http://localhost:11434/v1
# LLM_MODEL=qwen2.5:7b
```

The agent automatically detects the endpoint and handles authentication.

**Cost estimate:** ~$0.0007 per form with gpt-4o-mini (based on 47k input + 500 output tokens).

## Performance Comparison

| Implementation | Model | Success Rate | Avg Duration | Tool Calls | Cost |
|----------------|-------|--------------|--------------|------------|------|
| **Web Portal** | None (rule-based) | 100% | 1.9s | 0 | $0 |
| **MCP (Ollama)** | qwen2.5:7b | 100% | 59s | 12 | $0 |
| **MCP (OpenAI)** | gpt-4o-mini | TBD | ~10-15s | 12 | ~$0.0007 |

**Recommendation:**
- **Development/testing:** Use Ollama (free, no API limits)
- **Production/CI:** Use OpenAI API (faster, more reliable)
- **Simple forms:** Use web-portal track (fastest, deterministic)

## Troubleshooting

### Error: `does not support tools`

**Cause:** Model doesn't support OpenAI-compatible tool calling.

**Solution:** Switch to qwen2.5:7b or llama3.2:3b:
```bash
ollama pull qwen2.5:7b
# Update .env: LLM_MODEL=qwen2.5:7b
```

### Error: `model requires more system memory`

**Cause:** Not enough RAM for the model.

**Solution:** Use a smaller model:
```bash
ollama pull llama3.2:3b
# Update .env: LLM_MODEL=llama3.2:3b
```

Or close other applications to free up RAM.

### Error: `No API key found`

**Cause:** `.env` file missing or `LLM_BASE_URL` not set to localhost.

**Solution:** Verify `.env` contains:
```bash
LLM_BASE_URL=http://localhost:11434/v1
```

The agent auto-detects localhost and skips key validation.

### Slow Performance (>2 minutes per form)

**Cause:** Small model (llama3.2:3b) or insufficient RAM causing swap.

**Solution:**
1. Upgrade to qwen2.5:7b (faster inference)
2. Close memory-intensive apps
3. Consider switching to OpenAI API for production use

## Model Compatibility

| Model | Size | Tool Calling | Status | Notes |
|-------|------|--------------|--------|-------|
| **qwen2.5:7b** | 4.7 GB | ✅ Yes | ✅ Recommended | Good speed/quality balance |
| **llama3.2:3b** | 2.0 GB | ✅ Yes | ⚠️ Slow | Works but inference is slow |
| gemma3:12b | 8.1 GB | ❌ No | ❌ Incompatible | `does not support tools` error |
| gemma3:27b | 17 GB | ❌ No | ❌ Incompatible | Too large + no tool support |

## Code Changes

### agent.ts
- Added localhost detection in `makeClient()`
- Auto-sets dummy API key (`'ollama'`) for local endpoints
- No change needed when switching to OpenAI

### test-github-models.ts
- Skips token validation for localhost
- Displays `(not set — OK for local Ollama)` message
- Tests tool calling support

### .env
- Added Ollama-specific configuration
- Commented out GitHub Models config (blocked on 403)
- Easy swap between Ollama and OpenAI

## Next Steps

1. **Benchmark:** Run full 5-form comparison with Ollama vs Web Portal
2. **Optimize:** Reduce context size in prompts to speed up inference
3. **Production:** Switch to OpenAI API for faster, more reliable fills
4. **CI/CD:** Use web-portal track for automated testing (deterministic, fast)

---

**Current Status:** MCP form filler is **unblocked** and working locally. Add OpenAI key whenever ready to speed up inference from 59s → ~10-15s per form.
