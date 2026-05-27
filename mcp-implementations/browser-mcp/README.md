# browser-mcp — Planned

**Status:** Scaffold only. Implementation deferred until `playwright-mcp`
prototype lands a working baseline.

Will drive [BrowserMCP](https://browsermcp.io/) instead of
`@playwright/mcp`. BrowserMCP runs through a real user-controlled
browser via a Chrome extension bridge — different cost/latency/risk
profile from headless Playwright.

Implements the exact same `MCPFormFiller` contract from
`../shared/types.ts`. Drop-in compatible with `../shared/runner.ts`.

## Why a separate implementation?

| Concern | playwright-mcp | browser-mcp |
|---------|---------------|-------------|
| Browser | Headless Chromium spawned per run | User's real browser |
| Bot detection | High (headless signatures) | Low (real fingerprint) |
| Auth flows | Hard (no cookies) | Easy (existing session) |
| Setup | `npx` only | Chrome extension required |
| Throughput | High | Single-session |

## Implementation plan

1. Install BrowserMCP extension + bridge.
2. Replicate `client.ts` against BrowserMCP's MCP server.
3. Reuse `prompt.ts` and `agent.ts` from `playwright-mcp` *as a
   reference* — but copy, do not import. Folders are isolated.
