# skyvern-mcp — Planned

**Status:** Scaffold only. Implementation deferred.

Will integrate [Skyvern](https://github.com/Skyvern-AI/skyvern) via its
MCP server. Skyvern is a vision-first browser agent — it expects to
solve workflows from high-level natural-language goals plus screenshots,
rather than from explicit per-field tool calls.

Implements the exact same `MCPFormFiller` contract from
`../shared/types.ts`. Drop-in compatible with `../shared/runner.ts`.

## Implementation plan

1. Stand up Skyvern server locally (or hosted endpoint).
2. Wire `client.ts` against Skyvern's MCP interface.
3. Adapt prompt: Skyvern prefers a single "goal" string per run rather
   than tool-by-tool steering. Pass the `UserProfile` JSON inline.
4. Reuse the same `FillResult` schema for comparability.
