# Form Filling Agents

AI-powered form filling — two parallel implementations sharing the same agent logic:

| Implementation | Folder | Status |
|---|---|---|
| Browser Extension | [`extension/`](extension/) | Active development |
| Web Portal | [`web-portal/`](web-portal/) | In progress |

---

## Quick Start

```bash
# Extension
cd extension && npm install && npm run build

# Web Portal
cd web-portal && npm install && npm run dev
```

Root-level shortcuts (from repo root, requires dependencies installed in subfolders):

```bash
npm run extension:build           # compile extension scripts
npm run portal:dev                # start portal dev server on :3001
npm run benchmark:rule-based:quick
```

---

## Repository Layout

```
├── extension/              # Browser Extension (Chrome MV3 / Firefox MV2)
│   ├── src/                # TypeScript source
│   │   ├── implementations/  # Agent strategies (rule-based, vlm, llm, hybrid…)
│   │   ├── content/          # DOM content script
│   │   ├── background/       # Service worker
│   │   └── utils/            # form-detection, form-filler, storage
│   ├── public/             # Manifests + compiled JS
│   └── scripts/            # Benchmark CLI runner
│
├── web-portal/             # Web Portal (Next.js + Playwright server-side)
│   ├── src/
│   │   ├── parsers/        # Document → UserProfile (PDF, DOCX, TXT, JSON)
│   │   ├── scraper/        # URL → ScrapedForm (Playwright headless)
│   │   ├── filler/         # ScrapedForm + UserProfile → FillResult
│   │   ├── api/            # Next.js API routes (/api/fill, /api/parse)
│   │   └── types/          # Shared TypeScript types
│   └── app/                # UI pages and components
│
├── benchmark-results/      # Benchmark outputs (shared, all implementations)
├── Documentation/          # All project documentation
│   ├── Brainstorm.md       # Implementation options overview
│   ├── WebPortal.md        # Web portal detailed workflow
│   ├── Implementation.md   # Extension agent implementation tracker
│   ├── Flow.md             # End-to-end pipeline diagram
│   ├── Report.md           # Design decisions & architecture report
│   ├── Explanation.md      # Pipeline concepts explained
│   ├── Literature_review.md
│   ├── MultiModal-Benchmark.md
│   ├── Running_Local_LLM.md
│   └── TESTING.md
└── KnowledgeGraph/         # Structured repo context for AI agents
```

---

## Why two implementations?

The **Browser Extension** runs agents locally inside the browser. It is fast, private, and requires no server.

The **Web Portal** runs agents on a server. Users log in, upload documents (resume, ID, etc.), and submit a URL — the portal scrapes the form and fills it automatically using Playwright. It supports heavier models, stores user data persistently, and works without any browser plugin installed.

The agent logic (`UserProfile` → field-value mapping) is designed to be reused between both.

---

## Documentation

See [`Documentation/`](Documentation/) for the full set of docs. Key files:

- [WebPortal.md](Documentation/WebPortal.md) — web portal workflow and architecture
- [Implementation.md](Documentation/Implementation.md) — agent strategy tracker
- [Brainstorm.md](Documentation/Brainstorm.md) — all implementation options considered
- [Report.md](Documentation/Report.md) — design report and decisions

## Overview

This extension implements intelligent form filling agents that can:
- Detect and analyze forms on web pages
- Fill commercial data-based forms automatically
- Handle document upload fields
- Support multiple AI backends (extensible)

### Design Report

For a detailed architecture overview, comparisons with other approaches (MCP, VLM, RPA), and a production scaling guide, see the Design Report: [Report.md](Report.md)

## Features

- **Cross-browser support**: Chrome, Firefox, Edge
- **Form detection**: Automatically identify and extract form fields
- **Adaptive agents**: Rule-based and AI-powered form filling strategies
- **Document upload handling**: Detect and manage file upload fields
- **Settings management**: Configurable API keys and providers
- **TypeScript + Next.js**: Modern tech stack with type safety
- **FormFactory Benchmark**: Built-in evaluation against the FormFactory dataset with 25 forms and 13,800 annotated field-value pairs
- **Atomic & Episodic Metrics**: Comprehensive evaluation including click accuracy and value accuracy

## Project Structure

```
├── public/
│   ├── manifest.json           # Chrome manifest v3
│   ├── manifest-firefox.json   # Firefox manifest v2
│   ├── popup.html             # Popup UI
│   └── options.html           # Settings UI
├── src/
│   ├── agents/                # Form filling agents
│   │   └── form-agents.ts     # Agent implementations
│   ├── background/            # Service worker
│   │   └── service-worker.ts  # Background script
│   ├── content/               # Content scripts
│   │   └── content-script.ts  # DOM manipulation
│   ├── popup/                 # Popup UI (Next.js)
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── options/               # Options page (Next.js)
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── types/                 # TypeScript types
│   │   └── index.ts
│   └── utils/                 # Utility functions
│       ├── form-detection.ts  # Form analysis
│       ├── form-filler.ts     # Form filling
│       └── storage.ts         # Storage & messaging
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build extension scripts**:
   ```bash
   npm run build:extension
   ```

3. **Build Next.js pages** (optional for development):
   ```bash
   npm run build:next
   ```

4. **Full build**:
   ```bash
   npm run build
   ```

## Loading the Extension

### Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `public/` folder

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `public/manifest-firefox.json`

## Architecture

### Content Script (`content-script.ts`)
- Runs on all web pages
- Detects forms and form fields
- Communicates with background script
- Can inject form filling code into the DOM

### Background Service Worker (`service-worker.ts`)
- Handles messaging between popup and content scripts
- Manages form filling agents
- Stores user configuration and history

### Form Agents
- **CommercialFormAgent**: Rule-based form filling for commercial forms
- **DocumentUploadAgent**: Handles file upload detection
- **AdaptiveFormAgent**: Chains agents for best fit

### Popup UI
- Manual form filling trigger
- Quick settings access
- Status display

### Options Page
- API key configuration
- Provider selection (Custom/OpenAI/Anthropic)
- Settings persistence

### FormFactory Benchmark Integration
- Comprehensive evaluation framework with 25 forms across 8 domains
- Atomic-level metrics (Click accuracy, Value accuracy) for individual field types
- Episodic-level metrics (Form completion rate) for end-to-end performance
- Support for all field types: text, dropdown, checkbox, date, file upload, etc.
- Built-in evaluation against FormFactory's 13,800 annotated field-value pairs

## Usage

1. Click the extension icon to open the popup
2. The extension will detect forms on the page
3. Click "Fill This Form" to start the filling process
4. Adjust settings in the "Settings" page as needed

### Running FormFactory Benchmarks

The project includes comprehensive benchmarking tools based on the FormFactory paper.

**Quick benchmark:**
```bash
npm run test:quick
```

**Full benchmark:**
```bash
npm run test:full
```

**Test specific domain:**
```bash
npm run test:domain -- academic
```

**Test with ruler enhancement:**
```typescript
import { BENCHMARK_SCENARIOS } from './src/benchmark/benchmark-config';
const results = await runBenchmark(testCases, BENCHMARK_SCENARIOS.WITH_RULER);
```

See [Benchmark Documentation](./src/benchmark/README.md) for detailed usage and expected results.

## About BrowserMCP and Skyvern

**Why didn't we use them?**

Good question! Here's the analysis:

### What We Built (Native Extension)
- ✅ Direct browser integration (no overhead)
- ✅ Native DOM access and manipulation
- ✅ Works offline after installation
- ✅ Better for commercial/production use
- ✅ Tighter security model

### BrowserMCP / Skyvern (External Tools)
- ✅ Standardized protocols for AI agents
- ✅ Better for AI orchestration
- ✅ Easier multi-model evaluation
- ✅ Built-in browser automation
- ✅ Research-friendly

**Our choice**: We built as a native extension because:
1. **Speed**: Direct browser access is faster
2. **Simplicity**: No external dependencies
3. **Control**: Fine-grained access to form APIs
4. **User Experience**: Seamless integration

**If you wanted to add them**, you could:
- Use Skyvern as the automation backend (replace PyAutoGUI)
- Expose agents via BrowserMCP for external AI orchestration
- Keep the extension as a UI layer while using Skyvern for core logic

## Configuration

### Supported Providers
- **Custom**: Rule-based pattern matching (default)
- **OpenAI**: Uses OpenAI API for intelligent form analysis
- **Anthropic**: Uses Claude API for form filling

### API Key Setup
1. Go to extension settings
2. Select your AI provider
3. Enter your API key (if using OpenAI or Anthropic)
4. Save settings

## Development

### Build Commands
```bash
npm run dev          # Development mode
npm run build        # Build all
npm run build:extension  # Build extension scripts only
npm run build:next   # Build Next.js pages
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Adding New Agents

Create a new agent implementing the `Agent` interface:

```typescript
export class MyAgent implements Agent {
  name = 'My Agent';
  
  isApplicable(context: FormContext): boolean {
    // Check if this agent can handle the form
  }
  
  async analyze(context: FormContext): Promise<Record<string, string>> {
    // Return field-value mappings
  }
}
```

Register it in `AdaptiveFormAgent`.

## Paper Reference

This project is developed with reference to: https://arxiv.org/abs/2506.01520

## License

MIT

## Contributing

Contributions are welcome! Please ensure:
- Code follows the ESLint configuration
- Types are properly defined
- New features are accompanied by documentation

## Support

For issues or questions, please create an issue in the repository.
