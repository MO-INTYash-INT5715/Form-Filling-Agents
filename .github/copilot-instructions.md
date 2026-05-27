# This file provides AI-enhanced context for VS Code Copilot in this workspace

## ⚠️ Repo restructured 2026-05-26
- Extension code: `extension/` (was root `src/`)
- Web portal code: `web-portal/` (new)
- Always read `KnowledgeGraph/KnowledgeGraph.md` first.

## Project Type
Dual-track implementation: Browser Extension + Web Portal for AI-powered Form Filling Agents

## Technology Stack
- **Shared**: TypeScript, Next.js 14, React 18, Playwright, Tailwind CSS
- **Extension**: Chrome Manifest V3, Firefox Manifest V2, WebExtensions API
- **Portal**: Next.js API routes, NextAuth.js, pdf-parse, mammoth, formidable

## Two Parallel Implementations

### Browser Extension (`extension/`)
- Self-contained extension loaded into Chrome/Firefox
- Content script detects forms on-page; service worker orchestrates agents
- Agent strategies isolated in `extension/src/implementations/`
- Benchmarked against FormFactory (25 forms, 13,800 pairs)

### Web Portal (`web-portal/`)
- Server-side Next.js app; no browser plugin required
- Users upload documents → parsed into `UserProfile` JSON
- User provides URL → Playwright scrapes form → agent fills it headlessly
- Key modules:
  - `web-portal/src/parsers/document-parser.ts` — PDF/DOCX/TXT → UserProfile
  - `web-portal/src/scraper/form-scraper.ts` — URL → ScrapedForm
  - `web-portal/src/filler/form-filler.ts` — ScrapedForm + UserProfile → FillResult
  - `web-portal/src/api/fill.ts` — POST /api/fill
  - `web-portal/src/api/parse.ts` — POST /api/parse

## Shared Core Concept: UserProfile
`UserProfile` JSON is the single input to every fill agent.
- Extension source: `extension/src/types/index.ts`
- Portal source: `web-portal/src/types/index.ts`
- Keep in sync when fields change.

## Extension — Core Components

### Agents (`extension/src/agents/`)
- `CommercialFormAgent`: Fills commercial data forms using pattern matching
- `DocumentUploadAgent`: Detects and validates file upload fields
- `AdaptiveFormAgent`: Routes forms to appropriate agents

### Agent Strategies (`extension/src/implementations/`)
- `rule-based/` — Regex + keyword heuristics (baseline)
- `embedding-matcher/` — Cosine similarity on field labels
- `llm-structured/` — LLM with constrained JSON output
- `vlm-agent/` — Screenshot → VLM → fills
- `hybrid/` — rule-based + VLM fallback
- `mcp-agent/` — MCP orchestration

### Form Processing (`extension/src/utils/`)
- `form-detection.ts`: Analyzes DOM for forms and fields
- `form-filler.ts`: Executes filling logic
- `storage.ts`: Chrome storage and messaging

## Development Commands

```bash
# Extension
cd extension && npm install
npm run extension:build         # from root
npm run extension:dev           # from root (Next.js popup UI dev server)

# Web Portal
cd web-portal && npm install
npm run portal:dev              # from root — starts on :3001

# Benchmarks (run from root)
npm run benchmark:rule-based:quick
npm run benchmark:mcp-agent:quick
```

## Documentation
All docs in `Documentation/`:
- `WebPortal.md` — portal workflow, API reference, roadmap
- `Implementation.md` — extension agent tracker
- `Brainstorm.md` — all implementation options
- `Report.md` — design decisions

## Reference Material
- FormFactory Paper: https://arxiv.org/abs/2506.01520
- Chrome API Docs: https://developer.chrome.com/docs/extensions/
- Firefox API Docs: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/

2. Build extension: `npm run build`
3. Load in browser for testing
4. Implement AI backend integration (OpenAI/Anthropic)
