Implementation notes and next steps

Purpose
- Actionable checklist for engineering work: literature integration, architecture comparison, dataset improvements, and fine-tuning strategy.

Tasks
1. Literature consolidation
	- Collect and summarize key findings from `FFA/Literature/*.md` into `Documentation/`.
	- Extract methods that directly address spatial grounding and semantic field matching.
2. Architecture comparison
	- Produce a short matrix comparing: Extension + BrowserMCP, Extension + PlaywrightMCP, Server-hosted agent, and RPA-based flows.
	- Evaluate per axis: privacy, reliability, ease of deployment, and anti-bot risks.
3. Dataset & benchmark
	- Audit the current dataset for coverage gaps (live URLs, multi-page flows, conditional logic).
	- Add a small held-out set of live-site URLs for continuous evaluation.
4. Model & training
	- Prioritize a small, constrained-output local model for action emission (CLI/3B model) + a separate semantic matcher component.
	- Use constrained decoding or schema-based output to avoid malformed actions; fine-tune only the semantic matcher if possible.

Notes
- Bot detection, semantic matching, and dynamic forms are primary engineering risks — allocate early effort to mitigation strategies.

Extra notes (practical guidance)

- CLI/local LLMs: a small quantized model (3B class) can emit structured tool calls from a compact context (form schema + compact description). Benefits: low latency, offline, and low per-step cost. Tradeoffs: less robust on ambiguous cases; requires fine-tuning and a semantic matcher.

- Framework choices:
	- PlaywrightMCP: good for dataset creation (accessibility snapshots) but launches its own browser instance.
	- BrowserMCP: attaches to an existing Chrome tab via CDP — preferable for extension-driven, authenticated flows.
	- Skyvern: full orchestration + anti-bot tooling; useful for complex multi-page workflows.

- Fine-tuning & output constraints:
	- Use constrained decoding or schema enforcement for action emission to guarantee valid tool calls.
	- Separate semantic matching (embeddings / SFT) from action emission.

- Production risks to address early:
	1. Bot detection (CAPTCHAs, anti-bot proxies) — consider scope limitations or human-in-loop strategies.
	2. Dynamic conditional forms — re-snapshot the accessibility tree after each action.
	3. Privacy/PII: avoid sending sensitive fields to cloud models without explicit consent.


