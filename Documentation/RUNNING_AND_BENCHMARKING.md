# Running & Benchmarking (Canonical)

This document is the canonical merge for run/setup/benchmark guidance from:
- `TESTING.md`
- `BENCHMARK-COMPARISON.md`
- `MultiModal-Benchmark.md`
- `Running_Local_LLM.md`
- `OLLAMA-SETUP.md`
- `MCP-ISSUE-DIAGNOSIS.md`

---

## 1. Prerequisites

1. Node.js + npm
2. Python (for FormFactory server)
3. Playwright browser binaries
4. Optional LLM backend (Ollama/OpenAI/GitHub Models) for LLM-based agents

---

## 2. Install

```bash
# repo root
npm install

# extension track
cd extension
npm install
cd ..

# web portal track
cd web-portal
npm install
cd ..
```

Install Playwright Chromium for benchmark runs:

```bash
# from repo root
npm run benchmark:setup
```

---

## 3. Start FormFactory benchmark server

```bash
cd C:\Code\formfactory
pip install -r requirements.txt
python app.py
```

Expected server URL: `http://localhost:5000`

---

## 4. Benchmark commands (current scripts)

### Root-level scripts (`package.json`)

```bash
npm run benchmark:list
npm run benchmark:rule-based:quick
npm run benchmark:rule-based:full
npm run benchmark:mcp-agent:quick
npm run benchmark:mcp-agent:full
npm run benchmark:embedding
```

### Extension-level scripts (`extension/package.json`)

```bash
cd extension

npm run benchmark:rule-based:quick
npm run benchmark:rule-based:full
npm run benchmark:mcp-agent:quick
npm run benchmark:mcp-agent:full
npm run benchmark:embedding
npm run benchmark:llm-structured:quick
npm run benchmark:hybrid:quick
npm run benchmark:vlm-agent:quick
npm run benchmark:vision-agent:quick

npm run ablation:quick
npm run ablation:full
npm run ablation:agents
```

Results are written under `benchmark-results/`.

---

## 5. LLM configuration notes

### Ollama (local)

Recommended for local development:

```bash
ollama pull qwen2.5:7b
```

For multimodal agents (`vision-agent`, `vlm-agent`), use a vision-capable model (for example `qwen2.5vl:7b`), not text-only models.

### OpenAI / GitHub Models

Use provider credentials in each track's `.env` as required. MCP auth issues are usually provider access/scope issues, not Playwright tooling issues.

---

## 6. Notes on older benchmark docs

Some older docs contain obsolete script names (for example `test:quick`, `benchmark:llm-structured -- --quick`, or `ablation`).  
Use the command list in this file as source of truth.

