# FFA Documentation — Overview & Quickstart

This documentation set is the canonical entrypoint for the Form-Filling Agents (FFA) repository. It provides a focused flow so readers understand what the project contains, how to run the ablation experiments, how the analysis is computed, and where to find results.

Quick flow
- Read the Ablation plan: `Documentation/ABLATION-STUDY-PLAN.md`
- Follow the quick smoke steps (section below) to validate your environment.
- Run per-track ablation (extension, web-portal, MCP) to emit per-instance JSONL records into `Documentation/ablation-records/`.
- Aggregate with `scripts/aggregate-ablation.ts` to produce `Documentation/ABLATION-MASTER-REPORT.md`.

Where things live
- Shared utilities: `shared/scorer.ts`, `shared/cost-model.ts` (scoring & cost model used by all tracks)
- Per-track harnesses: `extension/`, `web-portal/`, `mcp-implementations/`
- Aggregator: `scripts/aggregate-ablation.ts`
- Machine-readable ablation records: `Documentation/ablation-records/*.jsonl`
- Human-readable master report: `Documentation/ABLATION-MASTER-REPORT.md`

How analysis is computed (brief)
- Atomic metrics: per-field-type value & click accuracy (shared/scorer.ts)
- Episodic metrics: form completion, fields-correct, fields-attempted
- Description fields: BLEU-4 approximation (shared/scorer)
- Cost: tokens measured from provider responses × `shared/cost-model.ts` rates (provider:model keyed)
- Reports aggregate mean ± 95% CI across instances (default N=5)

Quickstart (smoke)
1) Start the FormFactory server (Flask)
   cd C:\Code\formfactory
   pip install -r requirements.txt
   python app.py

2) Extension quick ablation (one instance per form)
   cd C:\Code\FFA\extension
   npx tsx scripts/ablation-study.ts --quick

3) Web-portal quick benchmark
   cd C:\Code\FFA\web-portal
   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx benchmark.ts --instances 1

4) MCP quick run (playwright-mcp)
   cd C:\Code\FFA\mcp-implementations\shared
   npx tsx runner.ts --impls playwright-mcp --runs 1

5) Aggregate results
   cd C:\Code\FFA
   npx tsx scripts/aggregate-ablation.ts

Contact & next steps
- The master ablation plan (detailed) is in `Documentation/ABLATION-STUDY-PLAN.md`.
- Model selection & how to change models: `Documentation/MODEL-SELECTION.md`.
- If you want me to run the smoke validations now, say "Run smoke tests" and I will execute them and report results.
