# FormFactory Benchmark — Summary & Usage

This document summarizes the FormFactory benchmark and explains how to use it in this repository for evaluation and development.

Dataset (high level)
- Forms: 25 representative forms across domains.
- Instances: ≈1,250 (≈50 per form).
- Annotated pairs: ≈13,800 field–value pairs.
- Field types: text, dropdown, radio, checkbox, date, file upload, numeric, description.

Core metrics
- Click accuracy: fraction of interactions that target the correct element.
- Value accuracy: correctness of the entered value for a field (exact or tolerant metrics for descriptive fields).
- Form completion: end-to-end success rate for a form instance.

Key takeaways
- Click accuracy is the dominant bottleneck in zero-shot VLM evaluations; spatial grounding is hard.
- Value accuracy is often higher than click accuracy, indicating semantic understanding is easier than pixel-precise interaction.
- Hybrid strategies (DOM heuristics + on-demand VLM) and ruler-enhanced scenarios improve results for many layouts.

Where the code is
- `src/benchmark/test-suite.ts` — mock test-case and sample generators.
- `src/benchmark/test-runner.ts` — runner that executes tests and computes metrics.
- `src/benchmark/evaluation-metrics.ts` — atomic & episodic metrics implementation.
- `src/benchmark/benchmark-config.ts` — scenarios (ruler, with/without heuristics).
- `src/benchmark/benchmark-analyzer.ts` — reporting and domain breakdown.

Quick commands
```bash
# Quick (sanity) benchmark
npm run test:quick

# Full benchmark (CI / nightly)
npm run test:full

# Domain-specific run
npm run test:domain -- academic
```

Best practices
- Use `test:quick` during development; run `test:full` in CI when changes stabilize.
- Maintain a small live-site held-out set for periodic evaluation (not only static schemas).
- Separate spatial and semantic improvements via ablations (e.g., ruler vs. DOM-only).

Extending the benchmark
- Add forms in `src/benchmark/formfactory-dataset.ts` and update mock generation in `test-suite.ts`.
- Add new field types by updating dataset schema and evaluation logic in `evaluation-metrics.ts`.

Reference
- B. Li et al., "FormFactory: An Interactive Benchmarking Suite for Multimodal Form-Filling Agents", arXiv:2506.01520.
