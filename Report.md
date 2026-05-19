# FormFactory Agent — Design, Comparison, and Scaling Report

Date: 2026-05-18

## Executive Summary

This report describes the architecture and operation of the FormFactory form-filling agent, contrasts our approach with alternative implementations (protocol-based MCPs, VLM-based systems, HTML summarizers, and RPA), and outlines a practical roadmap to scale the system to live websites as a browser extension or hosted service.

## How the solution works (high-level)

- Detection: a content script inspects the DOM and extracts candidate fields and metadata. See [src/content/content-script.ts](src/content/content-script.ts).
- Analysis / Agent: the background/service-worker orchestrates agents that analyze the form context and produce field-value mappings. Agents are implemented in [src/agents/form-agents.ts](src/agents/form-agents.ts).
- Execution: a `FormFiller` utility applies values to DOM elements (or simulates interactions in the benchmark). Implementation: [src/utils/form-filler.ts](src/utils/form-filler.ts).
- Orchestration & UI: the extension popup and options pages allow users to trigger fills, configure providers, and inspect results. See [src/popup](src/popup) and [src/options](src/options).
- Benchmarking: the repository contains a full benchmarking harness that creates mock form instances (`src/benchmark/test-suite.ts`), runs them (`src/benchmark/test-runner.ts`), scores results (`src/benchmark/evaluation-metrics.ts`), and summarizes insights (`src/benchmark/benchmark-analyzer.ts`).

Flow: content-script → service-worker (agent selection) → agent.analyze(context) → form-filler.apply(context, mapping) → confirmation/reporting.

## Core design decisions

- Modular agents: a small `Agent` interface lets us plug in rule-based, ML, or VLM-backed agents without changing the rest of the stack.
- Dataset-driven evaluation: the FormFactory dataset (25 forms, ~13.8k pairs) enables reproducible benchmarking and ablation studies.
- Local-first extension architecture: detection and light inference occur in the browser for direct DOM access; heavy model inference is optional and can be proxied to a server.
- Safety by design: user-triggered fills, opt-in model usage, and limited host permissions reduce risk.

## System components (mapping to repo)

- Form detection: [src/utils/form-detection.ts](src/utils/form-detection.ts)
- Agents: [src/agents/form-agents.ts](src/agents/form-agents.ts)
- Form filler: [src/utils/form-filler.ts](src/utils/form-filler.ts)
- Benchmark harness: [src/benchmark](src/benchmark)
- Runner + CLI: [scripts/run-benchmark.ts](scripts/run-benchmark.ts)

## Comparison with other implementation strategies

1. Protocol-based MCPs (Browser-MCP style)
   - Focus: protocol for model ↔ browser orchestration.
   - Pros: flexible multi-agent routing, research-friendly orchestration.
   - Cons (vs our approach): requires an orchestration layer; less opinionated about evaluation and local UX. Our stack bundles evaluation, agents, and a user-facing extension.

2. Skyvern / Orchestration platforms
   - Focus: remote automation/orchestration platforms (task scheduling, long-running agents).
   - Comparison: these platforms are powerful for complex, cross-page automation. We provide a lightweight browser-first architecture with an easy integration point if you want to route heavy work to an orchestrator.

3. Vision-Language Model (VLM) approaches
   - Focus: use images + language to do spatial reasoning (bounding boxes, layout understanding).
   - Pros: superior spatial grounding and visual disambiguation.
   - Cons: higher compute and privacy/latency costs. Recommended as an optional agent component (call VLM for difficult layouts, otherwise use DOM heuristics).

4. HTML summariser / DOM-only approaches
   - Focus: extract text and structural signals from DOM.
   - Pros: very fast, low compute, preserves privacy (no screenshots).
   - Cons: loses layout cues; fails on unlabeled or visually grouped inputs. Our system uses DOM heuristics by default and can augment with VLMs.

5. RPA / DOM automation (Selenium, Puppeteer)
   - Focus: scripted DOM interactions for deterministic workflows.
   - Pros: reliable for static workflows.
   - Cons: brittle across layouts and poor at semantic inference. FormFactory emphasizes semantic mapping and evaluation at scale.

## Scaling to live websites (practical guide)

1. Packaging & Permissions
   - Use Manifest V3 for Chrome/Edge; deploy Firefox-compatible manifest as needed.
   - Request minimal host permissions and use the runtime host-permission prompts when operating on new domains.

2. Robust DOM handling
   - Use MutationObservers to detect dynamically-loaded forms and handle SPAs.
   - Detect and handle Shadow DOM and iframes; inject scoped scripts only when allowed.

3. Model & Infrastructure options
   - Client-side inference: small models in WASM or ONNX for privacy-sensitive users.
   - Server-side inference: a model proxy service that batches requests, caches responses, and enforces quotas.
   - Hybrid: run heuristics locally; escalate to server/VLM for ambiguous cases.

4. Latency & UX
   - Provide incremental UI feedback (make best-effort fills immediately and enhance them with model responses).
   - Cache mappings to speed repeat visits.

5. Privacy, Security, and Compliance
   - Always ask explicit consent before sending form data or screenshots to external services.
   - Anonymize or redact sensitive fields by default (SSNs, credit cards, passwords).
   - Publish a clear privacy policy and data retention practices.

6. Monitoring & Improvement
   - Instrument opt-in telemetry for failure modes (field mismatches, low click accuracy).
   - Use automated CI benchmarking (jsdom + headless) to detect regressions.

7. Operational scaling
   - Use server-side caching, throttling, and regional endpoints for model calls.
   - Implement per-user rate-limits and graceful degradation when the model backend is unavailable.

## Roadmap & Recommendations

1. Add an optional VLM-backed agent for spatial grounding.
2. Add headless CI tests (jsdom) that run the benchmark on PRs.
3. Implement a secure server-side model proxy for batching and credential management.
4. Add telemetry and a dashboard to track real-world performance and error classes.

## Appendix — quick commands

```bash
npm install
npm run build:extension
npm run build:next
npm run test:quick
```
