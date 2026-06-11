# Ablation Study — Master Plan (Revised)

This file is the single source of truth for how the cross-track ablation is executed, how metrics are computed, and how the master report is produced.

Summary of current state (what's already implemented)
- Shared utilities: `shared/scorer.ts` (atomic/episodic + BLEU) and `shared/cost-model.ts` (provider:model → $/1M) exist and are used by extension benchmark.
- Extension ablation (`extension/scripts/ablation-study.ts`) now writes per-instance JSONL to `Documentation/ablation-records/` and honors `INSTANCES` (default 5 for non-quick).
- Web-portal benchmark updated to emit per-instance AblationRecord JSONL per agent into `Documentation/ablation-records/`.
- MCP shared runner appends per-run AblationRecord JSONL for MCP implementations.
- Aggregator: `scripts/aggregate-ablation.ts` reads JSONL files and produces `Documentation/ABLATION-MASTER-REPORT.md` (skeleton present).

Primary goals (unchanged)
1. Produce a single, reproducible master report comparing agents across tracks and providers (accuracy, latency, tokens, cost, robustness).
2. Ensure all tracks use the same scoring contract and cost model so comparisons are apples-to-apples.
3. Provide a documented, repeatable run manifest for reproducibility.

Canonical AblationRecord (per instance)
- See `shared/ablation-record.ts` (or the schema used by the harnesses). Key fields:
  - track, agent, provider, model, formId, instanceIndex
  - fieldsTotal, fieldsAttempted, fieldsCorrect, valueAccuracyPct
  - wallMs, llmMs, tokensIn, tokensOut, llmCalls, estimatedCostUSD
  - submitted, error, failureCategory
  - runId, commit, seed, timestamps

Immediate remaining tasks (P1 — P3)
1. Confirm provider-model pricing for Bedrock / Gemini and populate `shared/cost-model.ts` (placeholder rates currently used).
2. Finish wiring: ensure every MCP implementation (playwright-mcp, browser-mcp, skyvern-mcp) emits per-instance predicted values when available so the shared scorer can compute valueAccuracy. (playwright-mcp is highest priority)
3. Run quick provider sweep (N=1) for each LLM-backed agent: OpenAI (gateway), Ollama (local), Bedrock (gateway), Gemini (gateway). Validate outputs and token accounting.
4. Run default ablation (N=5) across tracks for headline comparisons overnight.
5. Review and publish `Documentation/ABLATION-MASTER-REPORT.md` and push run-manifest to `benchmark-results/run-manifest.json`.

Statistical & reproducibility rules
- Default N = 5 instances per form (quick = 1, full = 50)
- Report mean ± 95% CI for all primary metrics
- Fixed seed, pinned model strings, temperature = 0 for deterministic runs
- Record run-manifest: commit SHA, OS, Node, provider/model mapping, instance indices

Aggregator behavior
- `scripts/aggregate-ablation.ts` performs:
  1. Read all `Documentation/ablation-records/*.jsonl` files
  2. Group by (track, agent, provider, model)
  3. Compute mean ± CI for each metric and produce the master Markdown report and JSON data

Acceptance criteria (what "done" looks like)
- Every track emits canonical AblationRecord JSONL per instance
- Aggregator builds `Documentation/ABLATION-MASTER-REPORT.md` with leaderboards, Pareto frontier, per-field-type heatmaps, and per-domain breakdown
- Cost model populated with accurate rates for cloud providers (Bedrock/Gemini) and unit tests / sanity checks for cost computation

Run checklist (quick)
- Start Flask server at `http://localhost:5000`
- Run extension quick ablation
- Run web-portal quick benchmark
- Run MCP quick runner
- Run aggregator and inspect `Documentation/ABLATION-MASTER-REPORT.md`

If you want, I can now execute the smoke validation (extension + web-portal + MCP quick runs) and run the aggregator. Say "Run smoke tests now" and I will execute them and report results.