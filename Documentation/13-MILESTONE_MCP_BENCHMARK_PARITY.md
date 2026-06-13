# Milestone: MCP Benchmark Parity

**Goal:** Bring MCP track results to reproducible parity comparison against extension benchmark runs.

## Scope

1. Make MCP run configuration reproducible (provider, model, env vars, turn limits).
2. Run comparable quick benchmark slices and export structured outputs.
3. Produce a concise comparison note against:
   - `llm-structured`
   - `rule-based`
   - `mcp-agent`

## Deliverables

1. Repro command set in docs:
   - provider setup
   - benchmark commands
   - output locations
2. Updated benchmark outputs in repository JSON directories.
3. One short summary update in:
   - `Documentation/PROJECT_STATUS.md`
   - `Documentation/IMPLEMENTATION-HISTORY.md`

## Suggested execution order

1. Confirm MCP provider credentials and model access.
2. Run MCP quick benchmark commands with fixed config.
3. Run extension quick baselines in same environment.
4. Compare outputs and update status/history docs.

## Out of scope

- Full 1,250-instance runs for every model.
- New agent architecture redesign.
