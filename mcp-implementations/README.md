# MCP-Based Form Filling Implementations

**Last updated:** 2026-05-27
**Status:** `playwright-mcp` — active prototype. `browser-mcp` and `skyvern-mcp` — scaffolded.

This folder hosts three **fully isolated** end-to-end form-filling
implementations that drive *live* web forms (not the FormFactory
synthetic benchmark) via three different MCP servers. They are siblings
of the existing `extension/` and `web-portal/` tracks and share nothing
with them at the code level.

```
mcp-implementations/
├── shared/                # Live-form test set + comparison harness ONLY
│   ├── live-forms.json    # Curated list of live URLs to test against
│   ├── user-profile.json  # Sample UserProfile used by all 3 impls
│   ├── runner.ts          # Drives all 3 impls and writes results
│   └── types.ts           # FillRun, FillResult, ComparisonReport
│
├── playwright-mcp/        # IMPL-A — PlaywrightMCP (ACTIVE)
│   ├── src/
│   │   ├── client.ts      # MCP client wrapper (spawn server, JSON-RPC)
│   │   ├── agent.ts       # The form-filling agent loop
│   │   ├── prompt.ts      # System prompt + tool-use protocol
│   │   └── index.ts       # CLI entry: fill <url> <profile.json>
│   ├── tests/             # Smoke tests for the prototype
│   ├── README.md          # Setup, MCP server install, usage
│   └── package.json
│
├── browser-mcp/           # IMPL-B — BrowserMCP (planned)
│   ├── src/index.ts       # Stub — implements same Agent contract
│   ├── README.md
│   └── package.json
│
└── skyvern-mcp/           # IMPL-C — SkyvernMCP (planned)
    ├── src/index.ts       # Stub — implements same Agent contract
    ├── README.md
    └── package.json
```

## Hard isolation rules

1. Each implementation folder may import from its own `src/` and from
   `mcp-implementations/shared/` only. **No cross-implementation imports.**
2. Each has its own `package.json` and `node_modules`. No hoisting.
3. Each emits results into `benchmark-results/mcp-<name>/` using the
   same `FillResult` schema (see `shared/types.ts`).
4. The shared `runner.ts` is the *only* place that knows about all
   three.

## Shared contract

Every implementation exposes:

```ts
export interface MCPFormFiller {
  name: string;                       // "playwright-mcp" | ...
  init(): Promise<void>;
  fill(url: string, profile: UserProfile): Promise<FillResult>;
  close(): Promise<void>;
}
```

`FillResult` carries: fields attempted/filled, success flag, screenshot
path, total wall-clock time, total LLM tokens, total MCP tool calls,
and any error string.

## Comparison axes

The harness scores the three implementations on:

| Axis | What we measure |
|------|-----------------|
| Field accuracy | % of expected fields filled correctly |
| Form completion | Did the form reach a success/confirmation state? |
| Latency | Wall-clock seconds per form |
| Cost | LLM tokens + MCP tool-call count |
| Robustness | Pass rate across N runs per form |
| Failure modes | Categorised: bot-detection, agentic-loop, hallucination, popup, captcha |
