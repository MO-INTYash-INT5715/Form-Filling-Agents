# Developer Notes — Form Filling Agent

Last updated: 2026-05-19

Purpose
- Working notes, rules, and an actionable plan for the Form Filling Agent project.

Documentation & citation rules
- Verify dynamic facts via web search before asserting them.
- Label statements as **Verified fact** or **Inference / hypothesis**.
- When citing sources, include URL/title/date for independent verification.
- Flag gaps explicitly; avoid confident guesses where data is missing.

High-level goal
- Deliver a user-triggered, privacy-aware browser extension that reliably fills real-world forms.

Plan (stages)
- Stage 1 — Research & evaluation
  - Literature consolidation (MLLMs for GUI, RPA, MCP patterns).
  - Benchmarking & ablations on FormFactory.
  - Failure-mode analysis and architecture recommendation.
- Stage 2 — Dataset & engineering
  - Expand benchmark (live-site held-out set, multi-page, conditional flows).
  - Implement extension + optional local MCP helper; add CI tests.

Core engineering challenges
1. Field localization — spatial grounding & element resolution.
2. Semantic matching — mapping user data → form fields across diverse labels.
3. Validation & error handling — client-side validation, server errors.
4. Dynamic/conditional forms — progressive rendering, stateful flows, iframes, Shadow DOM.

Design guidance
- Use DOM / accessibility tree as the primary representation; use vision/VLMs only as fallbacks.
- Prefer local or hybrid inference for privacy-sensitive data.
- Fail explicit and loudly: prefer "I couldn't fill this" over silent wrong fills.

Architecture recommendations
- Extension + BrowserMCP (or small native helper) for authenticated live-site fills.
- PlaywrightMCP for headless evaluation and dataset generation.
- Modular `Agent` interface: separate semantic matcher, action emitter, and executor.

Next actions (short)
- Consolidate literature notes into `Documentation/`.
- Add live-site held-out test set and CI quick benchmark.
- Prototype a small local semantic matcher (embeddings + SFT) and constrained-action emitter.
