# Form-Filling Agents

> **Automated web form filling using LLMs, Vision Models, and Model Context Protocol**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Ollama](https://img.shields.io/badge/Ollama-qwen2.5:7b-green)](https://ollama.ai/)
[![Gemini](https://img.shields.io/badge/Gemini-2.0--flash-purple)](https://ai.google.dev/)

**Research Project** | IIT Bombay | May 2026 | [WabiSabi Tech](https://wabisabitech.in/)

---
On the other machine, just:

 1. Copy the .env file across (it has your Bedrock token + base URL)
 2. Run python scripts\setup-test-fixtures.py (regenerates the local dummy files)
 3. Run npm ci and npx playwright install --with-deps chromium
 4. Start Flask, then run the benchmark


## Quick Start

```bash
# 1) Clone and install
git clone https://github.com/MO-INTYash-INT5715/Form-Filling-Agents.git
cd Form-Filling-Agents
npm install
cd extension && npm install && cd ..
cd web-portal && npm install && cd ..

# 2) Start FormFactory server (separate terminal)
cd C:\Code\formfactory
pip install -r requirements.txt
python app.py

# 3) Install Playwright browser once
cd C:\Code\Form-Filling-Agents
npm run benchmark:setup

# 4) Run a quick benchmark from repo root
npm run benchmark:rule-based:quick
```

---

## Usage (Current Commands)

### Root-level scripts (`package.json`)

```bash
npm run extension:dev
npm run extension:build
npm run extension:lint

npm run portal:dev
npm run portal:build

npm run benchmark:list
npm run benchmark:rule-based:quick
npm run benchmark:rule-based:full
npm run benchmark:llm-structured:quick
npm run benchmark:llm-structured:full
npm run benchmark:mcp-agent:quick
npm run benchmark:mcp-agent:full
npm run benchmark:embedding

npm run benchmark:rule-based -- --quick
npm run benchmark:llm-structured -- --quick
npm run benchmark:mcp-agent -- --quick
npm run benchmark:vlm-agent -- --quick
npm run benchmark:vision-agent -- --quick
npm run benchmark:hybrid -- --quick
npm run ablation -- --quick
```

### Extension-local scripts (`extension/package.json`)

```bash
cd extension
npm run benchmark:rule-based:quick
npm run benchmark:llm-structured:quick
npm run benchmark:mcp-agent:quick
npm run benchmark:vlm-agent:quick
npm run benchmark:vision-agent:quick
npm run benchmark:hybrid:quick
npm run ablation:quick
npm run ablation:full
```

---

## Results Snapshot

**Winner:** **llm-structured** at **71.35% value accuracy** (145.8s runtime, ~$0.0012/form).

| Agent | Value Accuracy | Runtime | Tokens/Form | Cost/Form |
|---|---|---|---|---|
| **llm-structured** | **71.35%** | 145.8s | ~600 | ~$0.0012 |
| mcp-agent | 62.38% | 1257.5s | 700-900 | ~$0.0014-0.018 |
| rule-based | 57.66% | 42.3s | 0 | $0 |

Full analysis: [Documentation/reports/Report.md](./Documentation/reports/Report.md)

---

## Repository Structure

```
Form-Filling-Agents/
├── extension/                 # benchmark + agent implementations
├── web-portal/                # Next.js portal track
├── mcp-implementations/       # PlaywrightMCP/BrowserMCP/Skyvern experiments
├── benchmark-results/         # versioned root benchmark artifacts
├── Documentation/             # consolidated docs + report
├── KnowledgeGraph/            # architecture cache for AI coding sessions
└── README.md
```

---

## Documentation

Start here: **[Documentation/README.md](./Documentation/README.md)**

Key docs:
- [Documentation/reports/Report.md](./Documentation/reports/Report.md)
- [Documentation/RUNNING_AND_BENCHMARKING.md](./Documentation/RUNNING_AND_BENCHMARKING.md)
- [Documentation/IMPLEMENTATION-HISTORY.md](./Documentation/IMPLEMENTATION-HISTORY.md)
- [Documentation/MCP-ISSUE-DIAGNOSIS.md](./Documentation/MCP-ISSUE-DIAGNOSIS.md)
- [Documentation/GEMINI-INTEGRATION-DOCUMENTATION.md](./Documentation/GEMINI-INTEGRATION-DOCUMENTATION.md)
- [Documentation/LOCAL-LLM-SETUP.md](./Documentation/LOCAL-LLM-SETUP.md)

---

## Repository Policies

Repository policies are defined in:  
**[Documentation/REPOSITORY_POLICIES.md](./Documentation/REPOSITORY_POLICIES.md)**

This includes:
- benchmark JSON/versioning policy (**kept in repository**),
- lockfile policy (root + per-package lockfiles),
- documentation source-of-truth policy.

---

## License

MIT License — see [LICENSE](./LICENSE).
