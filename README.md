# Form-Filling Agents

> **Automated web form filling using LLMs, Vision Models, and Model Context Protocol**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Ollama](https://img.shields.io/badge/Ollama-qwen2.5:7b-green)](https://ollama.ai/)
[![Gemini](https://img.shields.io/badge/Gemini-2.0--flash-purple)](https://ai.google.dev/)

**Research Project** | IIT Bombay | May 2026 | [WabiSabi Tech](https://wabisabitech.in/)

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/MO-INTYash-INT5715/Form-Filling-Agents.git
cd Form-Filling-Agents/extension
npm install

# 2. Start FormFactory server (in separate terminal)
cd /c/Code/formfactory
python app.py  # Flask server at localhost:5000

# 3. Configure LLM provider (choose one)

# Option A: Gemini (recommended, 2x cheaper than GPT-4o-mini)
echo "LLM_PROVIDER=gemini" > .env
echo "GEMINI_API_KEY=your-key-here" >> .env
echo "LLM_MODEL=gemini-2.0-flash-exp" >> .env

# Option B: Ollama (free, local)
brew install ollama  # or download from ollama.ai
ollama pull qwen2.5:7b  # 4.7 GB
echo "LLM_PROVIDER=ollama" > .env
echo "LLM_MODEL=qwen2.5:7b" >> .env

# Option C: OpenAI
echo "LLM_PROVIDER=openai" > .env
echo "OPENAI_API_KEY=sk-..." >> .env
echo "LLM_MODEL=gpt-4o-mini" >> .env

# 4. Run benchmark (quick mode: 1 instance per form = 25 total)
npm run benchmark:llm-structured -- --quick
```

---

## Results Summary

**Winner:** **llm-structured** at **71.35% accuracy** (146s runtime, $0.0012/form)

| Agent | Value Accuracy | Runtime | Tokens/Form | Cost/Form |
|---|---|---|---|---|
| **llm-structured** (single-shot JSON) | **71.35%** | 145.8s | ~600 | $0.0012 |
| mcp-agent (iterative tool calls) | 62.38% | 1257.5s | 700-900 | $0.0014-0.018 |
| rule-based (heuristic) | 57.66% | 42.3s | 0 | $0 |
| vlm-agent (vision) | In progress | - | - | - |
| hybrid (rules + vision fallback) | In progress | - | - | - |

**Per Field Type (llm-structured):**
- Date: **100.0%** (perfect)
- Checkbox: 83.3%
- Dropdown: 78.9%
- String: 73.7%
- NumericInput: 61.1%
- Description: 54.6%

See [Documentation/reports/Report.md](./Documentation/reports/Report.md) for full analysis.

---

## Architecture

### Five Agent Implementations

1. **rule-based** - Pure heuristic pattern matching (no LLM)
   - 57.66% accuracy, $0 cost, 1.7s/form
   - Viable for internal tools and standard forms
   
2. **llm-structured** - Single-shot JSON generation from form schema
   - **71.35% accuracy, $0.0012/form, 146s runtime**
   - WINNER: Best balance of accuracy, cost, latency
   
3. **mcp-agent** - Iterative Model Context Protocol agent with retry loops
   - 62.38% accuracy, $0.0014-0.018/form, 1258s runtime
   - High latency, marginal accuracy gains over single-shot
   
4. **vlm-agent** - Vision-based screenshot + ruler markers
   - Uses Gemini 2.0 Flash or GPT-4o vision
   - Best for visually complex forms, iframes, Shadow DOM
   
5. **hybrid** - Rule-based first, VLM fallback for low-confidence fields
   - Adaptive cost: $0 to $0.005/form depending on complexity
   - Optimal for production: speed + accuracy + cost control

### Multi-Provider LLM Support

The project supports three LLM providers with automatic client factory:

```typescript
// extension/src/utils/llm.ts
const client = getLLMClient();  // Auto-selects based on LLM_PROVIDER env var

// Supports:
// 1. OpenAI SDK (openai, custom base URLs)
// 2. Ollama (local inference)
// 3. Google Gemini (generateContent API)
```

**Cost Comparison (per 1M tokens):**
- Gemini 1.5 Flash: $0.075 input / $0.30 output
- GPT-4o Mini: $0.15 input / $0.60 output (2x more expensive)
- Ollama: $0 (local inference)

See [GEMINI-INTEGRATION-DOCUMENTATION.md](./Documentation/GEMINI-INTEGRATION-DOCUMENTATION.md) for setup details.

---

## Pipeline Flow

The system follows a two-stage mapping approach:

### Stage 1: Document Parsing (Input Pipeline)
Extract structured data from unstructured user documents.

```
User Document (PDF/TXT) 
  → Document Parser (LLM)
  → UserProfile JSON (200+ fields, 14 domains)
```

### Stage 2: Form Filling (Agent Execution)
Map structured data to interactive DOM elements.

```
UserProfile JSON + Target Form URL
  → Agent (rule-based / llm-structured / mcp / vlm / hybrid)
  → AgentAction[] (type, click, select, ...)
  → Playwright Executor
  → Filled Form
```

**Key Components:**
- **FormFactory Benchmark**: 25 forms, 8 domains, 259 fields
- **Evaluation Metrics**: Click accuracy, value accuracy, form completion rate
- **Test Profiles**: 200+ fields across 14 domains (personal, professional, health, legal, finance, arts, conference, membership, workshop, startup, manufacturing, construction, IT, bugs)

See [Documentation/reports/Report.md](./Documentation/reports/Report.md#3-system-architecture--pipeline-flow) for detailed architecture.

---

## Usage

You can run benchmarks either from the **root directory** of the repository or from the **`extension/`** subdirectory.

### 1. From the Root Directory (Recommended)

```bash
# Run Ablation Study (all agents sequentially)
npm run ablation -- --quick  # Quick mode (25 total runs)
npm run ablation             # Full mode (1,250 total runs)

# Run Individual Agents (Quick Mode: 1 instance per form = 25 total)
npm run benchmark:rule-based -- --quick
npm run benchmark:llm-structured -- --quick
npm run benchmark:mcp-agent -- --quick
npm run benchmark:vlm-agent -- --quick

# Run Individual Agents (Full Mode: 50 instances per form = 1,250 total)
npm run benchmark:llm-structured -- --full
```

### 2. From the `extension/` Directory

```bash
cd extension

# Run Ablation Study
npm run ablation -- --quick

# Run Individual Agents
npm run benchmark:llm-structured -- --quick
npm run benchmark:llm-structured -- --full
```

### Changing LLM Provider at Runtime

```bash
# Use Gemini instead of Ollama (Linux/macOS)
export LLM_PROVIDER=gemini
export GEMINI_API_KEY=your-key-here
export LLM_MODEL=gemini-2.0-flash-exp
npm run benchmark:llm-structured -- --quick

# Use Gemini instead of Ollama (Windows PowerShell)
$env:LLM_PROVIDER="gemini"
$env:GEMINI_API_KEY="your-key-here"
$env:LLM_MODEL="gemini-2.0-flash-exp"
npm run benchmark:llm-structured -- --quick
```

---

## Repository Structure

```
Form-Filling-Agents/
├── extension/                      # Main benchmark + agent implementations
│   ├── src/
│   │   ├── implementations/
│   │   │   ├── rule-based/         # Heuristic baseline (57.66%)
│   │   │   ├── llm-structured/     # Single-shot JSON (71.35%, WINNER)
│   │   │   ├── mcp-agent/          # Iterative MCP (62.38%)
│   │   │   ├── vlm-agent/          # Vision-based (in progress)
│   │   │   ├── hybrid/             # Rules + VLM fallback (in progress)
│   │   │   └── embedding-matcher/  # Cosine similarity (deprecated)
│   │   ├── benchmark/
│   │   │   ├── runner.ts           # Benchmark orchestrator
│   │   │   ├── evaluation.ts       # Scorer (normalization, comparison)
│   │   │   ├── playwright-executor.ts  # Browser automation
│   │   │   └── types.ts            # Telemetry schema
│   │   ├── utils/
│   │   │   ├── llm.ts              # Multi-provider client factory
│   │   │   ├── form-detection.ts   # DOM parsing
│   │   │   └── form-filler.ts      # Action execution
│   │   └── scripts/
│   │       ├── run-benchmark.ts    # CLI entry point
│   │       └── ablation-study.ts   # Master ablation runner
│   ├── benchmark-results/          # All benchmark outputs
│   │   ├── llm-structured/
│   │   ├── mcp-agent/
│   │   ├── rule-based/
│   │   └── vlm-agent/
│   └── package.json                # Dependencies + scripts
├── web-portal/                     # Production web portal
│   ├── src/
│   │   ├── parsers/                # Document → UserProfile
│   │   ├── scraper/                # URL → ScrapedForm
│   │   ├── filler/                 # Form filling logic
│   │   └── agents/
│   │       ├── smart-matcher.ts    # 3-tier intelligent matcher
│   │       └── embedder.ts         # Embedding utility
│   └── data/
│       └── test-profile.json       # 200+ field test profile
├── mcp-implementations/            # MCP-driven live forms
│   ├── shared/
│   │   ├── types.ts                # MCPFormFiller interface
│   │   ├── runner.ts               # Cross-MCP comparison
│   │   ├── live-forms.json         # 25 real-world forms
│   │   └── user-profile.json       # Shared test profile
│   ├── playwright-mcp/             # @playwright/mcp (active)
│   ├── browser-mcp/                # BrowserMCP (scaffold)
│   └── skyvern-mcp/                # Skyvern (scaffold)
├── Documentation/
│   ├── reports/                    # Research reports
│   │   ├── Report.md               # Full technical report
│   │   └── Report.tex              # Academic LaTeX source
│   ├── IMPLEMENTATION-HISTORY.md   # Phase-by-phase changelog
│   ├── GEMINI-INTEGRATION-DOCUMENTATION.md  # Gemini setup guide
│   ├── LOCAL-LLM-SETUP.md          # Local LLM setup & guides
│   ├── VISION-AGENTS.md            # Multimodal architecture
│   ├── TESTING.md                  # Test infrastructure
│   └── MCP-ISSUE-DIAGNOSIS.md      # API permission diagnostics
└── README.md                       # This file
```

---

## Key Technical Achievements

### 1. Critical Scorer Bugs Fixed (Phase 6)

Three bugs understated ALL agents' accuracy by 6-13%:

**Bug 1: Date Format Mismatch**
- Gold: `YYYY/MM/DD`, Agent: `YYYY-MM-DD` (never matched)
- Fix: Normalize both to `YYYY-MM-DD`
- Impact: Date accuracy +84.6% for MCP agent

**Bug 2: Dropdown Label vs Value**
- Scorer read `<option value="...">` instead of display label
- Fix: Use `option.label` via `page.evaluate()`
- Impact: Dropdown accuracy +45.6% for MCP agent

**Bug 3: Float/Int Equivalence**
- Gold `250.0`, Agent `250` (never matched)
- Fix: Strip trailing zeros
- Impact: NumericInput accuracy +8.4% for MCP agent

**Total Impact:** MCP 48.92% → 62.38% (+13.5%), LLM-Structured 65.2% → 71.35% (+6.2%)

### 2. Single-Shot Beats Iterative

**Hypothesis:** Iterative MCP agent (see form → fill → verify → retry) would outperform single-shot LLM.

**Reality:** Single-shot LLM-Structured won by **9% absolute** (71.35% vs 62.38%).

**Why:**
- No retry overhead (5.8x faster: 146s vs 1258s)
- System prompt guidance > post-hoc verification
- Predictable cost/latency (1 call vs 1-10 calls)

### 3. Multi-Provider LLM Architecture

Added support for Google Gemini alongside OpenAI and Ollama:
- Unified `getLLMClient()` factory abstracts provider differences
- Handles Gemini's `generateContent()` vs OpenAI's `chat.completions.create()`
- Vision support: `inlineData` (Gemini) vs `image_url` (OpenAI)
- Structured output: `responseSchema` (Gemini) vs `json_schema` (OpenAI)
- 2x cost reduction: Gemini Flash $0.075/$0.30 vs GPT-4o-mini $0.15/$0.60

### 4. Comprehensive Test Profiles

Expanded test profiles from 36 fields to 200+ fields across 14 domains:
- Personal info, professional experience, health records, legal documents
- Finance applications, arts submissions, conference registrations
- Membership forms, workshop signups, startup applications
- Manufacturing orders, construction projects, IT tickets, bug reports

Ensures benchmark coverage across all 25 FormFactory forms.

---

## Documentation

**Core Documentation:**
- [Documentation/reports/Report.md](./Documentation/reports/Report.md) - Canonical technical study and results
- [Documentation/DOCUMENTATION-INDEX.md](./Documentation/DOCUMENTATION-INDEX.md) - Overview index of all documentation guides
- [Documentation/IMPLEMENTATION-HISTORY.md](./Documentation/IMPLEMENTATION-HISTORY.md) - Phase-by-phase changelog and metrics delta

**Technical Guides:**
- [Documentation/LOCAL-LLM-SETUP.md](./Documentation/LOCAL-LLM-SETUP.md) - Local Ollama setup and execution guides
- [Documentation/VISION-AGENTS.md](./Documentation/VISION-AGENTS.md) - Multimodal architecture and VLM guides
- [Documentation/GEMINI-INTEGRATION-DOCUMENTATION.md](./Documentation/GEMINI-INTEGRATION-DOCUMENTATION.md) - Complete Gemini API integration details
- [Documentation/WebPortal.md](./Documentation/WebPortal.md) - Web Portal architecture and matching optimizations

**Benchmarks & Testing:**
- [Documentation/TESTING.md](./Documentation/TESTING.md) - Playwright benchmark runner execution instructions
- [Documentation/MCP-ISSUE-DIAGNOSIS.md](./Documentation/MCP-ISSUE-DIAGNOSIS.md) - Diagnostics for Model Context Protocol permissions
- [extension/benchmark-results/](./extension/benchmark-results/) - Raw benchmark JSON data

---

## Key Learnings

### 1. Test Your Evaluation Infrastructure Early
Ran 48 hours of compute before discovering scorer bugs. **Validate metrics on a canary test before scaling.**

### 2. Simplicity Beats Complexity
Single-shot LLM (1 API call) > iterative MCP agent (1-10 calls with retries). **Start with simplest approach.**

### 3. Model Choice > Architecture
`qwen2.5:7b` weak on Description fields (54.6%). Architectural improvements won't fix model limitations. **Swap models before rewriting agents.**

### 4. Normalization is Non-Trivial
Date format, float equivalence, dropdown value vs label - **formalize all equivalence rules explicitly.**

### 5. Rule-Based Baselines Underrated
57.66% at $0 cost is competitive for many use cases. **Don't over-engineer** if 60% accuracy is acceptable.

### 6. Multi-Provider Flexibility Matters
Gemini Flash costs 2x less than GPT-4o-mini with comparable accuracy. **Provider lock-in is a liability.**

---

## Production Recommendations

### Use Case: Standard Forms (Job Apps, Health Insurance, Banking)
→ **llm-structured** (71.35%, 146s, $0.0012/form)
- Best accuracy-cost-latency tradeoff
- Single API call, predictable cost
- Works with Gemini, OpenAI, or Ollama

### Use Case: Cost-Sensitive / High Volume
→ **rule-based** (57.66%, 1.7s, $0)
- Zero cost, minimal latency
- Deterministic, no API dependency
- Good for internal tools with standard forms

### Use Case: Complex Visual Forms (iframes, Shadow DOM, Canvas)
→ **vlm-agent** (in progress)
- Vision-based element detection
- Robust to DOM obfuscation
- Higher cost ($0.005-0.01/form)

### Use Case: Production Hybrid
→ **hybrid** (rules + VLM fallback)
- Rules first (fast, free)
- VLM for low-confidence fields only
- Adaptive cost: $0 to $0.005/form

---

## Future Work

### High Priority
1. Complete VLM agent implementation (Gemini 2.0 Flash vision)
2. Complete Hybrid agent (rule-based + VLM fallback)
3. Add streaming support for real-time feedback
4. Implement retry logic for Gemini rate limits

### Medium Priority
4. Full benchmark run (`--full`: 50 instances per form = 1,250 total)
5. Cross-model comparison (Gemini Pro, Claude 3.5 Haiku, GPT-4o-mini)
6. Domain-specific tuning (Arts & Creative, Academic & Research)
7. Optimize MCP agent (success detection, DOM caching)

### Low Priority
8. Click accuracy metric (requires bounding box annotations)
9. Production pipeline (Chrome extension packaging, error handling)
10. Add CI/CD (headless benchmark on PR)
11. Model proxy with PII redaction and key management

---

## Citation

If you use this work, please cite:

```bibtex
@misc{sarang2026formfilling,
  author = {Sarang, Yash},
  title = {Form-Filling Agents: Benchmarking LLM, Vision, and MCP Approaches},
  year = {2026},
  publisher = {GitHub},
  journal = {GitHub repository},
  howpublished = {\url{https://github.com/MO-INTYash-INT5715/Form-Filling-Agents}},
  institution = {IIT Bombay}
}
```

**Potential publication venues:**
- The Web Conference (WWW) - Web automation track
- EMNLP - Resources and Evaluation track
- ACL Demo Track - Interactive systems
- arXiv preprint - Immediate dissemination

---

## Contributing

This is a research project archival repository. For questions or collaboration:

- **Author:** Yash Sarang (IIT Bombay)
- **Organization:** [WabiSabi Tech](https://wabisabitech.in/)
- **Email:** yash.sarang@iitb.ac.in
- **Issues:** Open GitHub issues for questions

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

## Acknowledgments

- **IIT Bombay** - Academic affiliation
- **WabiSabi Tech** - Project sponsorship
- **Ollama** - Local LLM inference
- **Google AI** - Gemini API access
- **Anthropic** - Model Context Protocol (MCP)
- **FormFactory** - Form generation framework

---

## Quick Links

- [Benchmark Results](./extension/benchmark-results/)
- [Technical Report](./Documentation/reports/Report.md)
- [Implementation History](./Documentation/IMPLEMENTATION-HISTORY.md)
- [Agent Implementations](./extension/src/implementations/)
- [Gemini Setup](./Documentation/GEMINI-INTEGRATION-DOCUMENTATION.md)

---

**Status:** Active Development - Core benchmarks complete, vision agents in progress, documentation finalized.

**Last Updated:** June 06, 2026
