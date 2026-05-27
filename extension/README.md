# Form Filling Agent — Browser Extension

This folder contains the **browser extension** implementation of the Form Filling Agents project.

## What lives here

```
extension/
├── public/                 # Chrome/Firefox manifests and static assets
│   ├── manifest.json       # Chrome Manifest V3
│   ├── manifest-firefox.json
│   └── js/                 # Compiled content/background scripts
├── src/
│   ├── agents/             # High-level agent classes (CommercialFormAgent, etc.)
│   ├── background/         # Service worker (message routing, state)
│   ├── content/            # Content script (DOM detection, form filling)
│   ├── implementations/    # Isolated agent strategies
│   │   ├── rule-based/     # Baseline: regex + keyword heuristics
│   │   ├── embedding-matcher/ # Semantic cosine-similarity matching
│   │   ├── llm-structured/ # LLM with constrained JSON output
│   │   ├── vlm-agent/      # Vision-Language Model (screenshot → fills)
│   │   ├── hybrid/         # DOM + VLM fallback chain
│   │   └── mcp-agent/      # MCP orchestration
│   ├── options/            # Settings page (Next.js)
│   ├── pipeline/           # Input pipeline (UserProfile parsing)
│   ├── popup/              # Popup UI (Next.js)
│   ├── types/              # Shared TypeScript types
│   └── utils/              # form-detection, form-filler, storage
├── scripts/                # Benchmark CLI runner
├── __tests__/              # Unit / integration tests
├── next.config.js
├── tsconfig.json           # Next.js / general TS config
├── tsconfig.extension.json # Extension content/background compile config
└── tsconfig.scripts.json   # Benchmark scripts compile config
```

## Architecture

- **Content script** runs on every page: detects forms, extracts field metadata, sends context to background.
- **Service worker** orchestrates agents, manages storage, optionally calls external model APIs.
- **Agents** live under `src/implementations/`; each is self-contained, benchmarked independently.
- **UserProfile** (JSON) is the sole input to all agents — the pipeline that produces it is swappable (document upload, clipboard, form-fill history).

## Quick Start

```bash
# From the extension/ directory (or from root: cd extension && ...)
npm install
npm run build           # compiles both extension scripts and Next.js pages
```

Load unpacked in Chrome:
1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `extension/public/`

Load in Firefox:
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** → select `extension/public/manifest-firefox.json`

## Benchmarking

```bash
npm run benchmark:rule-based:quick    # quick run — 1 instance per form
npm run benchmark:rule-based:full     # full run  — 50 instances per form
npm run benchmark:mcp-agent:quick
npm run benchmark:embedding
```

Results land in `../benchmark-results/` (shared with root).

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Local-first processing | Privacy: PII stays in browser unless user opts in to cloud models |
| Isolated agent strategies | Fair benchmark comparison; no cross-contamination of logic |
| `UserProfile` as single input | Decouples parsers (PDF, clipboard, portal) from filling logic |
| Playwright for benchmarks | Robust DOM-based automation vs. fragile coordinate clicking |

## See Also

- [Web Portal implementation](../web-portal/README.md)
- [Documentation/](../Documentation/) — full architecture docs
- [Documentation/Implementation.md](../Documentation/Implementation.md) — agent implementation tracker
- [benchmark-results/](../benchmark-results/) — benchmark outputs
