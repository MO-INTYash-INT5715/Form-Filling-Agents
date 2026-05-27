# playwright-mcp Setup Issues & Resolution

## Current Status (2026-05-27)

The `playwright-mcp` prototype is scaffolded and the MCP server (Playwright tools) works correctly, but **LLM connectivity is blocked** by two network/auth issues:

### Issue 1: SSL Certificate Validation Failure ✓ FIXED
- **Root cause**: Corporate network with cert validation requirements
- **Error**: `CRYPT_E_NO_REVOCATION_CHECK - unable to check revocation`
- **Fix applied**: Set `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env` (development workaround)
- **Proper fix**: Set up corporate root CA at `C:\certs\corp-root-ca.pem` using `scripts/set-global-ca.ps1`

### Issue 2: GitHub Models Authentication ⚠ BLOCKED
- **Root cause**: GitHub token invalid or missing "Models: read" scope
- **Error**: `401 Unauthorized` when hitting `https://models.github.ai/inference`
- **Current token**: Starts with `github_pat_...` but returns 401
- **Required**: GitHub account with Copilot access + fine-grained PAT with "Models: read" scope

## Test Results

✓ MCP server spawns correctly (`npm test` passes)
✓ 23 Playwright tools enumerated (browser_navigate, browser_click, etc.)
✓ SSL connectivity works with TLS verification disabled
✗ LLM API calls fail with 401 Unauthorized

## Next Steps

**Option A: Fix GitHub Models auth** (recommended for multi-model testing)
1. Go to https://github.com/settings/tokens
2. Generate fine-grained PAT with "Models: read" scope
3. Update `GITHUB_TOKEN` in `.env`
4. Rerun: `npx tsx src/index.ts fill --url https://httpbin.org/forms/post --profile ../shared/user-profile.json`

**Option B: Switch to OpenAI** (simpler, single provider)
1. Get OpenAI API key from https://platform.openai.com/api-keys
2. Update `.env`:
   ```env
   OPENAI_API_KEY=sk-...
   LLM_BASE_URL=https://api.openai.com/v1
   LLM_MODEL=gpt-4o-mini
   ```
3. Remove or comment out `GITHUB_TOKEN`

**Option C: Test without LLM** (validate MCP infrastructure only)
The smoke test (`npm test`) already validates that the MCP server works. To go further without LLM:
- Manual Playwright script to fill the httpbin form
- Benchmark the web-portal track (doesn't need MCP)
- Work on extension agents (rule-based, embedding-matcher don't need LLM)

## What Works Right Now

- Extension track (5 agent implementations on FormFactory benchmark)
- Web portal scaffolding (scraper, filler, document parser)
- MCP server infrastructure (Playwright tools via stdio)
- Type system & shared contracts across all three tracks

## Clean-up Tasks

1. Remove exposed GitHub token from `.env` history (already masked in this doc)
2. Generate valid token OR switch to OpenAI
3. Optional: Set up corporate root CA properly (`scripts/set-global-ca.ps1`)
