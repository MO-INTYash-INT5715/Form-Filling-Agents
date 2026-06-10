# MCP Track: Issue Diagnosis & Resolution Guide

> **Canonical merged doc:** [RUNNING_AND_BENCHMARKING.md](./RUNNING_AND_BENCHMARKING.md)
>  
> This file is retained as a detailed historical working note.

**Date**: 2026-05-28  
**Status**: ❌ **BLOCKED ON AUTH**

---

## The Problem

The MCP-based form filler (playwright-mcp) **cannot use LLMs** because GitHub Models API returns:

```
403 Forbidden
Error: No access to model: openai/gpt-4.1-mini
Code: no_access
```

This blocks **all MCP agent testing** — without LLM inference, the agent can't decide which Playwright tools to call or how to fill form fields.

---

## Root Cause

Your GitHub account **does not have GitHub Models enabled**.

### What's Required (Both):
1. **GitHub Copilot subscription** (Individual $10/mo, Business $19/mo, or Enterprise)
2. **GitHub Models beta access** (separate opt-in, even with Copilot)

### Current State:
- ✓ GitHub PAT is valid (`github_pat_11CD5JTFY...`)
- ✓ PAT has "Models: read" permission
- ✓ API endpoint responds (https://models.github.ai/inference)
- ✗ Account lacks model access

---

## What Works vs What's Blocked

### Works ✓
- MCP server spawns correctly (`@playwright/mcp@0.0.27`)
- 23 Playwright tools enumerate successfully
- Token authentication passes (no 401)
- Dependencies installed (`openai@4.104.0`, `@modelcontextprotocol/sdk@1.29.0`)

### Blocked ✗
- **Chat completions** (403)
- **Model listing** (404 — endpoint doesn't exist for your account)
- **Any LLM-powered agent loop** (can't decide which tools to call)
- **MCP benchmark runs** (no way to process UserProfile → form fields)

---

## Test Results

Run `npx tsx test-github-models.ts` in `/mcp-implementations/playwright-mcp/`:

```
[2/3] Listing available models...
✗ Failed to list models: 404 404 page not found

[3/3] Testing chat completion...
❌ CHAT COMPLETION FAILED
Error: 403 No access to model: openai/gpt-4.1-mini
```

---

## Why This Affects MCP

The MCP agent architecture requires LLM inference to:

1. **Plan tool sequences**: "To fill this form, first navigate to URL, then call get_selector for email field..."
2. **Match fields semantically**: "The form field 'custname' should be filled with profile.personal.firstName + lastName"
3. **Handle dynamic responses**: "That selector failed, try an alternative"
4. **Verify completion**: "Did the form submit successfully? Check for confirmation text."

Without LLM access, the MCP client **has tools but no brain to use them**.

---

## Workarounds (Pick One)

### Option A: Get GitHub Models Access (Recommended)

**Steps**:
1. Subscribe to GitHub Copilot: https://github.com/features/copilot
2. Request GitHub Models access: https://github.com/marketplace/models
3. Wait for approval email (usually instant for Copilot users)
4. Re-run test: `npx tsx test-github-models.ts`

**Pros**: Lowest friction, no code changes  
**Cons**: $10/month, requires GitHub approval

---

### Option B: Use OpenAI API Key Directly

**Steps**:
1. Get API key: https://platform.openai.com/api-keys
2. Update `.env`:
   ```bash
   # Comment out GitHub Models
   # GITHUB_TOKEN=github_pat_...
   # LLM_BASE_URL=https://models.github.ai/inference

   # Add OpenAI
   OPENAI_API_KEY=sk-proj-...
   LLM_BASE_URL=https://api.openai.com/v1
   LLM_MODEL=gpt-4o-mini
   ```
3. Test: `npx tsx test-github-models.ts`

**Pros**: Works immediately, $0.150/$0.600 per 1M tokens (4o-mini)  
**Cons**: Pay-per-use, requires OpenAI account

**Cost estimate** (gpt-4o-mini):
- Input: $0.150/1M tokens (~$0.0002 per form)
- Output: $0.600/1M tokens (~$0.0005 per form)
- **Total: ~$0.0007 per form** (very cheap)

---

### Option C: Run Local Ollama (Free, Offline)

**Steps**:
1. Install Ollama: https://ollama.com/download
2. Pull a model:
   ```bash
   ollama pull llama3.2
   ```
3. Start server:
   ```bash
   ollama serve
   ```
4. Update `.env`:
   ```bash
   # Comment out GitHub Models
   # GITHUB_TOKEN=...
   # LLM_BASE_URL=https://models.github.ai/inference

   # Add Ollama
   LLM_BASE_URL=http://localhost:11434/v1
   LLM_MODEL=llama3.2
   ```
5. Test: `npx tsx test-github-models.ts`

**Pros**: Free, runs offline, no rate limits  
**Cons**: Slower inference (~1-3s per call), requires local GPU/CPU

**Recommended models**:
- `llama3.2` (3B params, fast, good for tool use)
- `qwen2.5:7b` (better structured output)
- `gemma2:9b` (highest quality, slower)

---

### Option D: LM Studio (GUI Alternative to Ollama)

**Steps**:
1. Download LM Studio: https://lmstudio.ai
2. Download a GGUF model (e.g., `Llama-3.2-3B-Instruct-Q4_K_M.gguf`)
3. Start local server (port 1234 by default)
4. Update `.env`:
   ```bash
   LLM_BASE_URL=http://localhost:1234/v1
   LLM_MODEL=llama-3.2-3b-instruct
   ```

**Pros**: Nice GUI, model management, free  
**Cons**: Same as Ollama (local inference overhead)

---

## Comparison Table

| Option | Cost | Setup Time | Latency | Accuracy | Offline |
|--------|------|------------|---------|----------|---------|
| **GitHub Models** | $0 (with Copilot) | Wait for approval | ~300ms | High (GPT-4.1-mini) | ✗ |
| **OpenAI Direct** | ~$0.0007/form | 5 min | ~200ms | High (gpt-4o-mini) | ✗ |
| **Ollama** | $0 | 15 min | ~1-3s | Medium (Llama 3.2) | ✓ |
| **LM Studio** | $0 | 20 min | ~1-3s | Medium (Llama 3.2) | ✓ |

---

## Recommended Path Forward

### For Quick Testing (Today)
**→ Use OpenAI API key** (Option B)
- Works in 5 minutes
- Costs pennies per test
- Good enough to unblock MCP development

### For Production (Long-term)
**→ Get GitHub Models** (Option A)
- Free with Copilot (which you likely already have/want)
- Officially supported by GitHub
- Better rate limits than OpenAI free tier

### For Cost-Conscious / Offline Work
**→ Ollama** (Option C)
- Zero ongoing cost
- Works offline (plane, coffee shop, etc.)
- Good enough for dev/test (not production-critical)

---

## Impact on Project

### Benchmark Results (Current)
From `Documentation/BENCHMARK-COMPARISON.md`:
```
| mcp-agent | 26 | 0.0% | 0.9% | 38.5% | 0ms | $0.0000 |
```

**Why so low?** The 0.9% accuracy is from the MCP agent **failing to get LLM responses** and either:
- Timing out
- Falling back to empty/default values
- Randomly guessing field selectors

It's not that the MCP architecture is bad — **it literally can't run**.

### What Unlocks After Fixing Auth

Once we have LLM access:
1. **MCP agent can actually think** (plan tool sequences, match fields)
2. **Re-run benchmarks** on FormFactory's 25 forms
3. **Compare MCP vs web portal** (LLM-powered vs type-aware)
4. **Test all 3 MCP servers** (playwright-mcp, browser-mcp, skyvern-mcp)

**Expected accuracy** after unblocking: 70-85% (based on other LLM-powered agents)

---

## Testing the Fix

After applying any workaround:

```bash
cd /c/Code/Form-Filling-Agents/mcp-implementations/playwright-mcp

# Test API access
npx tsx test-github-models.ts

# Should see:
✓ Response: test successful
✅ GitHub Models API is working!

# Then test actual form filling
npx tsx src/index.ts fill \
  --url https://httpbin.org/forms/post \
  --profile ../shared/user-profile.json
```

Expected output:
```json
{
  "success": true,
  "filled": 8,
  "attempted": 10,
  "durationMs": 4200,
  "cost": 0.0015
}
```

---

## Files Created/Modified

### New Files
- `mcp-implementations/playwright-mcp/test-github-models.ts` — Diagnostic script (reproduces 403)
- `Documentation/MCP-ISSUE-DIAGNOSIS.md` — This file

### Modified Files
- `mcp-implementations/playwright-mcp/.env.example` — Added multi-provider docs (already done)

---

## Summary

**Problem**: 403 "No access to model" from GitHub Models API  
**Root cause**: Account lacks GitHub Models beta access  
**Blocks**: All MCP agent testing and benchmarking  
**Quick fix**: Use OpenAI API key ($0.0007/form, 5 min setup)  
**Long-term fix**: Get GitHub Copilot + Models access (free ongoing)  
**Alternative**: Ollama (free, offline, slower)

**Next step**: Pick a workaround, update `.env`, re-run `test-github-models.ts` ✓
