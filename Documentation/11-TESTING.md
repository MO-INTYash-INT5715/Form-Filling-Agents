# Testing & Benchmarking Guide

This guide describes the FormFactory evaluation infrastructure and details how to execute benchmarks on the form-filling agents.

---

## 1. Directory Structure & Layout

All benchmark code is located in `extension/` and uses headless Chromium via Playwright:

* **`extension/src/benchmark/`**
  * `runner.ts` — Benchmark orchestrator that loads the dataset, triggers the selected agent, and logs results.
  * `playwright-executor.ts` — Drives headless Chromium via Playwright to simulate user keystrokes, clicks, and selections.
  * `evaluation.ts` — Scoring module that normalizes inputs and evaluates field value matches.
  * `dataset-loader.ts` — Loads form schemas, fields, and gold answers.
  * `config.ts` — Configures viewport dimensions, timeouts, and agent selection profiles.
* **`extension/scripts/`**
  * `run-benchmark.ts` — CLI entry point to execute benchmarks for individual agents.
  * `ablation-study.ts` — Master CLI tool to run sequential ablation benchmarks across all agents.

---

## 2. CLI Reference & Execution Scripts

All commands must be executed from the `extension/` directory:

```bash
cd extension
```

### 2.1 Sanity Check Benchmarks (Quick Mode — 25 forms total)
Quick mode evaluates 1 test case profile instance per form. Useful for local development and smoke tests.

```bash
# Rule-Based Baseline
npm run benchmark:rule-based:quick

# LLM-Structured Agent (recommended default)
npm run benchmark:llm-structured:quick

# Model Context Protocol (MCP) Agent
npm run benchmark:mcp-agent:quick

# Vision & Multimodal Agents (requires VLM configuration)
npm run benchmark:vlm-agent:quick
npm run benchmark:vision-agent:quick

# Run all agents sequentially (Quick Ablation Study)
npm run ablation:quick
```

### 2.2 Full Ablation Benchmarks (Full Mode — 1,250 runs total)
Full mode evaluates 50 test cases per form, capturing statistical variance.

```bash
# Full Ablation Study
npm run ablation:full

# Individual Agent Full Runs
npm run benchmark:rule-based:full
npm run benchmark:mcp-agent:full
```

### 2.3 Diagnostic Utility
List all FormFactory form templates registered in the benchmark suite:
```bash
npm run benchmark:list
```

---

## 3. Evaluation & Normalization Rules

To prevent trivial differences from marking correct fills as incorrect, the scoring suite (`evaluation.ts`) applies several normalization heuristics:

1. **Date Normalization:** Formats like `YYYY/MM/DD` or `MM/DD/YYYY` are coerced into ISO standard `YYYY-MM-DD` before comparison.
2. **Numeric Normalization:** Floats and integers are converted, and trailing zeros are stripped (e.g. `250.00` and `250.0` match `250`).
3. **Dropdown Label Matching:** Evaluates the display labels (e.g. `"Doctor Consultation"`) instead of option value attributes (e.g. `"consultation"`).
4. **Text Normalization:** Text strings are lowercased and stripped of leading/trailing whitespace.
5. **Descriptive Fields:** Long-form description text uses BLEU-4 scoring, marking the fill successful if the BLEU score is $\ge 30$.

---

## 4. Troubleshooting Benchmarks

* **Incomplete Fills due to timeouts:** In `config.ts`, you can increase `actionTimeout` if pages are loading slowly or if the local Ollama instance is experiencing high latency.
* **Service Worker crashes:** View Chrome extension worker panels at `chrome://extensions` and inspect the service worker logs for extension-specific background faults.
* **Certificate / TLS errors:** If benchmark forms fail to load due to certificate warnings, run scripts prefixing with `NODE_TLS_REJECT_UNAUTHORIZED=0`.
* **Out of Memory / Slow execution:** Ensure local Ollama services aren't sharing system resources with other high-memory containers. Switch to smaller models (like `llama3.2:3b`) to conserve memory if needed.
