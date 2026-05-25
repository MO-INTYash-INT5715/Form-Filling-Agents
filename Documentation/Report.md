# Design Report — Form Filling Agent

Date: 2026-05-19

Purpose
- Concise architecture summary, design decisions, and a practical roadmap to scale the form-filling agent to real websites.

Architecture (high level)
- Content script: extracts the DOM / a11y tree and candidate fields.
- Background (service worker): agent orchestration, storage, and optional MCP integration.
- Agents: modular implementations (rule-based, heuristics, VLM-backed) that map context → field-value mappings.
- Executor (`FormFiller`): applies interactions to the page (click, type, select).
- Benchmark harness: dataset + runner + analyzer for reproducible evaluation.

Key design choices
- Local-first extension: use DOM/a11y tree for speed and privacy; escalate to server or VLM only for ambiguous cases.
- Modular agent interface: pluggable strategies for domain-specific logic or model-backed reasoning.
- Safety & consent: user-triggered fills, opt-in model usage, and minimal host permissions.

Comparison with alternatives (short)
- MCP / orchestration: excellent for research and long-running tasks, but adds infrastructure complexity.
- VLMs: strong spatial reasoning; use selectively due to compute and privacy costs.
- DOM-only heuristics: fast and private but fails on unlabeled or visually grouped inputs.
- RPA (Selenium/Puppeteer): deterministic for scripted flows but brittle for semantic generalization.

Scaling checklist (practical)
1. Use Manifest V3 and request minimal host permissions.
2. Handle dynamic content: MutationObservers, Shadow DOM, iframe scopes.
3. Re-snapshot the accessibility tree after each action for conditional forms.
4. Provide progressive UI feedback and opt-in telemetry for error classes.
5. Redact PII before sending to external services; prefer local models where possible.

Roadmap (recommended next steps)
1. Add a VLM-backed agent for difficult layouts (on-demand, opt-in).
2. Implement CI regression tests (headless + jsdom) that run quick benchmarks on PRs.
3. Build a secure model proxy for batching and credential management.
4. Collect a small set of live-site test URLs for continuous evaluation.

Appendix — quick commands
```bash
npm install
npm run build:extension
npm run build:next
npm run test:quick
```
