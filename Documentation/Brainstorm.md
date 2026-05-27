# Form Filling Agents — Implementation Options

This document lists viable implementation approaches for the Form Filling Agents project, beyond the current Web Extension and Web Portal ideas. It draws on the repository Knowledge Graph and the Implementation notes (see KnowledgeGraph/KnowledgeGraph.md and Documentation/Implementation.md).

## Context (short)
- Project stack: TypeScript, Next.js, WebExtensions (KnowledgeGraph)
- Current architecture centers on an extension (content script + service worker) and isolated agent implementations under `src/implementations/` (Implementation.md)
- Existing implementations: rule-based, embedding-matcher, VLM, LLM-structured, hybrid (Implementation.md)

## Candidate Implementation Options

1. Browser Extension (existing)
	- What: In-browser content script + background/service-worker that detects forms and runs agents locally.
	- Pros: Low friction for users, direct DOM access, strong privacy (local-first), low latency.
	- Cons: Browser permission surface, cross-browser maintenance, limited access to external systems that require credentials.
	- When to choose: Primary interactive workflow for end-users and quick opt-in demos.

2. Web Portal / SaaS (existing idea)
	- What: Central web app where users submit a URL, form snapshot, or upload a document; server runs agents and returns fills or downloadable results.
	- Pros: Easier to manage versions and models, central telemetry and batching, simpler billing for paid features.
	- Cons: Privacy/PII exposure, higher infra costs, added latency.
	- When to choose: Multi-step workflows, user dashboards, or business customers who prefer hosted services.

3. REST API / Hosted Agent Service
	- What: A backend service exposing a JSON API (submit form descriptor/screenshot + profile → field-value mapping or action plan).
	- Pros: Decouples UI from agents (extension, portal, SDK can call same API); enables server-side heavy models, batching, and caching via a model proxy (MCP pattern).
	- Cons: PII/PII handling required, steady infra and key-management costs.
	- Integration notes: Provide a gated `/fill` endpoint, webhook callbacks for long-running RPA jobs, and a model-proxy layer for secret management.

4. Embeddable JS SDK / Site Plugin
	- What: Small library/site plugin (npm package or script) site owners install to optionally enable assisted filling on their forms.
	- Pros: Least intrusive for users of a site (hosts opt in), can reduce extension permissions and UX friction, good for B2B partnerships.
	- Cons: Requires site owner adoption; different security model (CSP, host trust).
	- When to choose: Partnerships with large platforms or when owners want to enable assisted-fills on their forms.

5. Mobile App (Native) / Mobile SDK
	- What: Native iOS/Android app or SDK that can fill forms inside webviews or integrate with OS-level autofill/accessibility APIs.
	- Pros: Access to mobile-only flows; can integrate with password/autofill systems.
	- Cons: Platform fragmentation, App Store policies, more complex QA.
	- When to choose: Mobile-first product or enterprise clients needing mobile automation.

6. Desktop App / Electron + Native Integrations
	- What: Electron or native app that provides system-level autofill or automates browser instances for internal users.
	- Pros: Centralized updates, can ship bundled local models for offline use.
	- Cons: Larger install footprint, platform-specific packaging.

7. Server-side RPA / Headless Browser Service (Playwright / Puppeteer)
	- What: Server agents that drive real browsers (headless or headed) to perform authenticated, multi-page workflows.
	- Pros: Handles authenticated/multi-page flows and complex JavaScript; good for scheduled or high-throughput automation.
	- Cons: Bot-detection risk, credentials handling, heavier infra and maintenance.
	- Note: The repo already contains Playwright-based benchmark and Form Instances server patterns (Flow.md).

8. CLI / Batch Processing with Local LLMs
	- What: Command-line tools that process datasets or batch fill instances using local models (Ollama, LM Studio, quantized models).
	- Pros: Reproducible research workflows, offline capability, easy benchmarking.
	- Cons: Not interactive for end-users.
	- When to choose: Benchmarking, enterprise offline workflows, research experiments (Implementation.md notes on local models).

9. Model Proxy / MCP Orchestration Layer
	- What: A thin orchestration service that routes requests to chosen models, batches calls, enforces quotas and redaction, and manages API keys.
	- Pros: Cost control, unified auditing, safer production usage of external models.
	- Cons: Extra infra complexity; becomes a critical security piece.
	- When to choose: When using paid cloud LLMs/VLMs at scale or when multiple clients require different model backends.

10. Password Manager / OS Autofill Integration
	 - What: Integrate as a plugin for password managers or use OS autofill APIs to surface suggested values.
	 - Pros: Natural UX for end-users; leverages existing secure vaults.
	 - Cons: Strict security review, limited control over form interactions, platform constraints.

11. Hybrid Patterns (recommended for MVP scaling)
	 - Extension + Server Proxy: Local detection + light inference in extension, escalate ambiguous fields to REST API for heavier models.
	 - Portal + RPA: Use portal for manual review and hand-off to RPA workers for authenticated tasks.
	 - SDK + Extension: Site SDK offers enhanced detection; extension handles cross-site fallback.

## Privacy, Security & Compliance Notes
- Prefer local-first heuristics and redaction hooks before sending any PII externally (Implementation.md guidance).
- Require explicit user opt-in before sending screenshots or PII to cloud VLMs (VLM README / Implementation.md).
- Minimize requested host permissions in extensions and document required scopes clearly.
- Use a model-proxy for key management and audit logging when calling cloud APIs.

## Quick Recommendation for Next Steps
1. For user-facing MVP: ship the Browser Extension (interactive) + a lightweight Model Proxy API for on-demand cloudy inference (Extension + REST API hybrid).
2. For enterprise / authenticated flows: prototype a Playwright RPA pipeline behind an authenticated REST API.
3. For research and benchmarking: maintain the CLI + local LLM paths and continue harnessing FormFactory benchmarks already present in `src/benchmark/`.

---
_Notes:_ This brainstorm synthesizes repo findings (KnowledgeGraph, Implementation, Flow) into an options checklist. Pick 1–2 complementary approaches for an incremental roadmap: quick user adoption (extension) + central orchestration for heavy tasks (API/RPA).

