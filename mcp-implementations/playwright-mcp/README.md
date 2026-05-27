# playwright-mcp — End-to-End Form Filler

**Status:** Active prototype (current focus of the repository).
**Approach:** An LLM agent loop that talks to Microsoft's
[`@playwright/mcp`](https://github.com/microsoft/playwright-mcp) server
over JSON-RPC, plus a sample `UserProfile`, to fill *live* web forms.

## How it works

```
+------------------+      tools/list, tools/call       +-------------------+
|  agent.ts (LLM)  | <-------- JSON-RPC stdio -------> |  @playwright/mcp  |
|                  |                                   |  (headless Chrome)|
+--------+---------+                                   +-------------------+
         |
         | UserProfile (JSON)
         v
  Live form URL  ──►  navigate ──► snapshot ──► fill ──► snapshot ──► submit
```

The agent receives:
- The accessibility-tree snapshot returned by `browser_snapshot`
- The `UserProfile` JSON
- A fixed prompt explaining the tool protocol

It emits a sequence of tool calls (`browser_type`, `browser_select_option`,
`browser_click`, …) until either (a) the form is submitted, (b) it runs
out of fields to fill, or (c) the per-form turn budget is exhausted.

## Install

```bash
cd mcp-implementations/playwright-mcp
npm install
# No chromium download needed — we drive the installed Google Chrome
# via --browser chrome. If Chrome is missing, install it normally or
# set MCP_BROWSER_CHANNEL=msedge to use Edge instead.
```

## Configure

Copy `.env.example` to `.env` and fill in the token. The `.env` is gitignored.

```dotenv
# GitHub Models — OpenAI-SDK compatible, authed with a GitHub PAT
# (fine-grained, "Models: read" scope). Works with any Copilot-enabled
# GitHub account; no separate API subscription.
GITHUB_TOKEN=ghp_...
LLM_BASE_URL=https://models.github.ai/inference
LLM_MODEL=openai/gpt-4o-mini
MAX_TURNS_PER_FORM=20

# Browser to drive. "chrome" = your installed Google Chrome (skips
# Playwright's bundled chromium, which often fails behind corp certs).
MCP_BROWSER_CHANNEL=chrome
```

### Why GitHub Models instead of `api.openai.com`?

GitHub Models exposes the same OpenAI chat-completions API surface (so
the OpenAI SDK works unchanged — just swap `baseURL` + `apiKey`) but
authenticates with a normal GitHub PAT. One token covers every
implementation in `mcp-implementations/` — no per-vendor key sprawl.

Model names use the `<vendor>/<model>` form on GitHub Models, e.g.
`openai/gpt-4o-mini`, `openai/gpt-4o`, `meta/Meta-Llama-3.1-70B-Instruct`.

### Falling back to direct OpenAI

If you ever want to bypass GitHub Models, set `OPENAI_API_KEY` and
unset `GITHUB_TOKEN`. The agent picks whichever key is present.

## Run a single form

```bash
npx tsx src/index.ts fill \
  --url https://httpbin.org/forms/post \
  --profile ../shared/user-profile.json
```

## Run the full comparison

```bash
# From repo root:
npx tsx mcp-implementations/shared/runner.ts \
  --impls playwright-mcp --runs 3
```

Results land in `benchmark-results/mcp-playwright-mcp/<form>_<run>.json`
and the aggregate is `benchmark-results/mcp-comparison.json`.

## Notes & known limitations

- The MCP server's accessibility-tree snapshots can be large; we cap
  per-snapshot characters in `prompt.ts`.
- File-upload, captcha, and multi-page wizards are explicitly
  out-of-scope for the first prototype.
- Bot-detection responses are detected by URL change or response-status
  heuristics in `agent.ts` and reported as `failureCategory: "bot-detection"`.
