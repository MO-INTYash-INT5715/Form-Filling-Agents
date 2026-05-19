# Testing & Benchmarking Guide

This concise guide explains how to run and interpret the FormFactory benchmark included in this repository. For design and scaling notes, see [Report.md](Report.md).

Quick commands
- Quick benchmark (sanity checks):
```bash
npm run test:quick
```
- Full benchmark (all instances):
```bash
npm run test:full
```
- Run a single domain (e.g., `academic`):
```bash
npm run test:domain -- academic
```

Key facts (summary)
- Forms: 25 representative forms across domains
- Instances: ~1,250 (50 per form)
- Annotated pairs: ~13,800 field–value pairs

Core metrics
- Click accuracy — fraction of actions that target the correct input element.
- Value accuracy — field value correctness (exact match or tolerant metric for descriptions).
- Form completion — end-to-end success rate for submitting a form correctly.

Interpreting results (rules of thumb)
- Click accuracy < 20%: spatial grounding needs work (use ruler, VLMs, or heuristics).
- Value accuracy < 50%: semantic matching or input extraction problem.
- Form completion < 30%: multi-field coordination or dynamic form handling issues.

Extending the benchmark
- Add forms in `src/benchmark/formfactory-dataset.ts` and update `test-suite.ts` mock generators.
- Add new field types by updating dataset schema and evaluation logic in `evaluation-metrics.ts`.

Best practices
- Use the quick benchmark to iterate on agents; run the full benchmark in CI when changes stabilize.
- Enable the ruler-enhanced scenario to measure improvements in spatial grounding.

Troubleshooting
- If content scripts fail to inject: check manifest host permissions and content script `matches` patterns.
- If service worker fails: inspect the extension Service Worker console (chrome://extensions → Service worker → Inspect).

References
- FormFactory paper: https://arxiv.org/abs/2506.01520
