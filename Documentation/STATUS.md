# Form Filling Agents — Project Status Report
## Generated: 2026-05-27 14:50 IST

### TL;DR
Three parallel tracks (Extension, Web Portal, MCP-implementations) are scaffolded with a shared UserProfile contract. Extension agents are benchmarked on FormFactory. MCP track (live-form filling via LLM+tools) is prototyped but currently blocked by auth issues.

---

## Track 1: Browser Extension ✓ STABLE

**Location**: `extension/`  
**Status**: Benchmarked, working  
**Platform**: Chrome MV3 / Firefox MV2  
**Benchmark**: FormFactory (25 synthetic forms, ~260 fields)

### Implemented Agents

| Agent | Approach | Status | Results Dir |
|-------|----------|--------|-------------|
| rule-based | Keyword/regex on labels | ✓ | `benchmark-results/rule-based/` |
| embedding-matcher | Local MiniLM cosine sim | ✓ | `benchmark-results/embedding-matcher/` |
| llm-structured | A11y tree → JSON schema | ✓ | `benchmark-results/llm-structured/` |
| vlm-agent | Screenshot + ruler markers | ✓ | `benchmark-results/vlm-agent/` |
| hybrid | Rule-based + VLM fallback | ✓ | `benchmark-results/hybrid/` |
| mcp-agent | Browser/Playwright MCP | ⚠ | `benchmark-results/mcp-agent/` |

**Key files**:
- `extension/src/agents/form-agents.ts` — Agent registry
- `extension/src/implementations/<name>/agent.ts` — Each agent's logic
- `extension/scripts/run-benchmark.ts` — Benchmark runner

**Build & Test**:
```bash
cd extension
npm install
npm run build
npm run benchmark
```

---

## Track 2: Web Portal ⚙ SCAFFOLDED

**Location**: `web-portal/`  
**Status**: Scaffolded, not yet deployed  
**Platform**: Next.js + headless Playwright  
**Use case**: Server-side form filling with document upload → UserProfile extraction

### Architecture

```
User uploads PDF/DOCX
    ↓
web-portal/src/parsers/document-parser.ts → UserProfile
    ↓
User submits target URL
    ↓
web-portal/src/scraper/form-scraper.ts → ScrapedForm (Playwright)
    ↓
web-portal/src/filler/form-filler.ts → FillResult
    ↓
API returns result + screenshot
```

**API Routes** (planned):
- POST `/api/parse` — Document → UserProfile
- POST `/api/fill` — URL + UserProfile → FillResult
- GET `/api/jobs/:id` — Poll async fill job

**Key files**:
- `web-portal/src/parsers/` — PDF/DOCX/TXT → UserProfile
- `web-portal/src/scraper/form-scraper.ts` — Playwright headless scraper
- `web-portal/src/filler/form-filler.ts` — Drives agents server-side
- `web-portal/app/` — Next.js UI (upload, results dashboard)

**Status**: ✓ Infrastructure tested end-to-end (2026-05-27). Scraper works perfectly, filler has low accuracy (~0% on httpbin) due to simple rule-based matching.

**Test results** (see `Documentation/WEB-PORTAL-TEST-RESULTS.md`):
- Scraper: ✓ Found all 12 fields correctly
- Filler: ⚠ 0/5 filled (selector + mapping issues)
- Infrastructure: ✓ Playwright + type system working

**Needs**:
1. Fix element selectors (waitForSelector vs $)
2. Improve field mapping (port embedding-matcher or llm-structured from extension)
3. Test PDF → UserProfile conversion
4. Run FormFactory benchmark via portal

---

## Track 3: MCP Implementations ⚠ BLOCKED (auth issue)

**Location**: `mcp-implementations/`  
**Status**: Playwright-MCP prototype ready, LLM auth blocked  
**Use case**: LLM-driven live-form filling via MCP tool protocol

### Three Implementations (shared contract)

| Name | MCP Server | Status | Notes |
|------|------------|--------|-------|
| playwright-mcp | @playwright/mcp | ⚙ Prototype ready | Blocked by GitHub Models 401 auth |
| browser-mcp | BrowserMCP | 📋 Scaffolded | Stub only |
| skyvern-mcp | Skyvern | 📋 Scaffolded | Stub only |

**Shared contract** (`mcp-implementations/shared/types.ts`):
```typescript
interface MCPFormFiller {
  name: string;
  init(): Promise<void>;
  fill(url: string, profile: UserProfile): Promise<FillResult>;
  close(): Promise<void>;
}
```

**Test forms** (`mcp-implementations/shared/live-forms.json`):
- httpbin-form (https://httpbin.org/forms/post)
- w3schools-form (https://www.w3schools.com/html/html_forms.asp)
- Placeholders for real opt-in forms

**Comparison runner** (`mcp-implementations/shared/runner.ts`):
Drives all three implementations × N runs per form → `benchmark-results/mcp-comparison.json`

### Blocking Issues

1. **GitHub Models auth**: Token returns 401 Unauthorized
   - Need: Fine-grained PAT with "Models: read" scope from https://github.com/settings/tokens
   - OR: Switch to OpenAI directly (`OPENAI_API_KEY`)

2. **SSL cert validation**: Corporate network blocks revocation check
   - Workaround: `NODE_TLS_REJECT_UNAUTHORIZED=0` in `.env` (dev only)
   - Proper fix: Set up corporate root CA via `scripts/set-global-ca.ps1`

**What works right now**:
- MCP server spawns correctly (`cd mcp-implementations/playwright-mcp && npm test` ✓)
- 23 Playwright tools enumerated (browser_navigate, browser_click, etc.)
- Types and contracts are in place

**What's blocked**:
- End-to-end form fill (needs LLM to drive tool calls)
- Comparison across three MCP servers

See `mcp-implementations/playwright-mcp/SETUP-ISSUES.md` for detailed diagnostics.

---

## Shared Infrastructure

### UserProfile (single input contract)

All three tracks consume the same `UserProfile` JSON schema:

| Track | Producer | Location |
|-------|----------|----------|
| Extension | `extension/src/pipeline/input-pipeline.ts` | In-browser parsing |
| Web Portal | `web-portal/src/parsers/document-parser.ts` | Server-side doc upload |
| MCP | `mcp-implementations/shared/user-profile.json` | Static sample for testing |

**Type definitions** (keep in sync manually):
- `extension/src/types/index.ts`
- `web-portal/src/types/index.ts`
- `mcp-implementations/shared/types.ts`

### Benchmark Results

All agents write to `benchmark-results/<name>/`:
```
benchmark-results/
├── rule-based/          ← Extension track
├── embedding-matcher/
├── llm-structured/
├── vlm-agent/
├── hybrid/
├── mcp-agent/
├── mcp-playwright-mcp/  ← MCP track (when unblocked)
├── mcp-browser-mcp/
├── mcp-skyvern-mcp/
└── mcp-comparison.json  ← Aggregate
```

---

## Immediate Next Steps

### Option A: Unblock MCP track (requires auth fix)
1. Get valid GitHub token OR switch to OpenAI
2. Run: `cd mcp-implementations/playwright-mcp && npx tsx src/index.ts fill --url https://httpbin.org/forms/post --profile ../shared/user-profile.json`
3. Iterate on prompt engineering to improve fill accuracy
4. Implement browser-mcp and skyvern-mcp stubs
5. Run comparison harness

### Option B: Complete Web Portal track (no blockers)
1. Test document parser: `web-portal/src/parsers/document-parser.ts` with sample PDFs
2. Deploy locally: `cd web-portal && npm run dev`
3. Test scraper + filler on httpbin form
4. Build out UI dashboard for job monitoring
5. Run FormFactory benchmark via web-portal agents

### Option C: Extension polish (already working)
1. Re-run benchmark with latest code: `cd extension && npm run benchmark`
2. Generate aggregate comparison table (accuracy, latency, cost per agent)
3. Update `Documentation/Report.md` with latest numbers
4. Package extension for manual Chrome/Firefox load-and-test

### Option D: Cross-track alignment
1. Verify UserProfile schema consistency across all three `types/` files
2. Add shared validation/schema library (Zod?) to catch drift
3. Document which fields each agent/form actually uses (coverage matrix)

---

## Documentation State

| Doc | Status | Location |
|-----|--------|----------|
| Project README | Exists | `README.md` |
| Knowledge Graph | ✓ Current | `KnowledgeGraph/KnowledgeGraph.md` |
| Research Report | ✓ Current | `Documentation/Report.md` |
| LaTeX Report | ✓ Current | `Documentation/Report.tex` |
| Web Portal Design | ✓ | `Documentation/WebPortal.md` |
| MCP Setup Issues | ✓ NEW | `mcp-implementations/playwright-mcp/SETUP-ISSUES.md` |
| Status Report | ✓ NEW | `Documentation/STATUS.md` (this file) |

---

## Git State (uncommitted changes)

Large restructure in progress:
- Moved `src/` → `extension/src/`
- Added `web-portal/` top-level folder
- Added `mcp-implementations/` top-level folder
- Many root-level files deleted (old extension paths)

**Recommendation**: Commit the restructure as a single "refactor: reorganize into three tracks" commit before making further changes.

```bash
git add -A
git commit -m "refactor: split into extension/, web-portal/, mcp-implementations/ tracks"
```

---

## Token Efficiency Note

Per the Knowledge Graph protocol:
1. Always read `KnowledgeGraph/KnowledgeGraph.md` first (~800 tokens)
2. Load specific `KnowledgeGraph/graph/*.json` per task
3. Only read source files if actually modifying them

Graph files in place:
- `KnowledgeGraph/graph/agents.json` (extension implementations)
- `KnowledgeGraph/graph/mcp-implementations.json` (MCP track)
- Other graph files TBD (benchmark.json, ui.json, utils.json)

---

## MVP Status: Ready for what?

**Can demo today**:
- Extension agents on FormFactory benchmark (all 5 agents)
- MCP server infrastructure (tool enumeration)

**Blocked**:
- MCP end-to-end live-form fill (auth)
- Web portal end-to-end (needs testing)

**Recommendation**: Focus on **Option B (Web Portal)** since it has no external blockers and can demonstrate end-to-end flow with document upload → profile extraction → headless fill.
