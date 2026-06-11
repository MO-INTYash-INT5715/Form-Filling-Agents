Form-Filling Agents — Current state & next actions

Status summary:
- Documentation consolidated and revised under Documentation/README.md.
- Shared utilities implemented: `shared/cost-model.ts` and `shared/scorer.ts` (unified cost + metrics).
- Extension ablation now emits per-instance JSONL (Documentation/ablation-records/).
- Web-portal and MCP runners updated to append AblationRecord JSONL for the aggregator.
- Aggregator script added: `scripts/aggregate-ablation.ts` (produces Documentation/ABLATION-MASTER-REPORT.md).

Quick validation (smoke) steps:
1) Start FormFactory server
   cd C:\Code\formfactory
   pip install -r requirements.txt
   python app.py

2) Extension quick ablation (one instance per form):
   cd C:\Code\FFA\extension
   npx tsx scripts/ablation-study.ts --quick

3) Web-portal quick benchmark:
   cd C:\Code\FFA\web-portal
   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx benchmark.ts --instances 1

4) MCP quick run (PlaywrightMCP):
   cd C:\Code\FFA\mcp-implementations\shared
   npx tsx runner.ts --impls playwright-mcp --runs 1

5) Aggregate results (after the above completes):
   cd C:\Code\FFA
   npx tsx scripts/aggregate-ablation.ts
   # Outputs: Documentation/ABLATION-MASTER-REPORT.md and Documentation/ablation-master-data.json

Next priority tasks:
- Wire MCP implementations to return per-field predicted values when possible so the shared scorer can be used for value-accuracy parity.
- Populate Bedrock/Gemini pricing in `shared/cost-model.ts` when account access is available.
- Run a provider sweep (quick N=1) across providers: OpenAI, Bedrock (via gateway), Gemini, Ollama.
- Schedule full runs (N>=5) for headline report once provider sweep validated.

Files changed (high level):
- added: shared/scorer.ts, shared/cost-model.ts, scripts/aggregate-ablation.ts
- updated: web-portal/benchmark.ts (writes JSONL), mcp-implementations/shared/runner.ts (writes JSONL), extension/scripts/ablation-study.ts (writes JSONL)
- docs: Documentation/README.md, Documentation/ABLATION-STUDY-PLAN.md, Documentation/RUNNING_AND_BENCHMARKING.md (rebuilt)

If you'd like, run the smoke validations now and I will report results and next actionable fixes.