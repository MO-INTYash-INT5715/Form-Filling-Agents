# Documentation Index

Complete guide to the Form-Filling-Agents documentation structure.

**Last Updated:** June 08, 2026

---

## Quick Navigation

### Getting Started
* [../README.md](../README.md) - Project overview, quick start, architecture
* [LOCAL-LLM-SETUP.md](./LOCAL-LLM-SETUP.md) - Local Ollama setup, models, and CLI run commands
* [TESTING.md](./TESTING.md) - Playwright benchmark runner, scripts, and normalization rules

### Technical Research Report
* [reports/Report.md](./reports/Report.md) - Full technical study, validated Phase 7 results, related work survey, and system flows
* [reports/Report.tex](./reports/Report.tex) - Academic LaTeX source for the technical report

### Tech Guides & Architecture
* [WebPortal.md](./WebPortal.md) - Web portal architecture, API routes, and 3-tier matching engine
* [VISION-AGENTS.md](./VISION-AGENTS.md) - Multimodal grounding, ruler overlay grid, and vision agents
* [GEMINI-INTEGRATION-DOCUMENTATION.md](./GEMINI-INTEGRATION-DOCUMENTATION.md) - Gemini API integration notes and comparisons to OpenAI
* [IMPLEMENTATION-HISTORY.md](./IMPLEMENTATION-HISTORY.md) - Detailed phase-by-phase changelog and metrics delta
* [MCP-ISSUE-DIAGNOSIS.md](./MCP-ISSUE-DIAGNOSIS.md) - Diagnostic guides for API access/403 permissions

---

## Document Descriptions

### 1. Research Reports

#### [reports/Report.md](./reports/Report.md) (and [reports/Report.tex](./reports/Report.tex))
* **Primary audience:** Academic researchers, technical evaluators
* **Content:**
  * Technical abstract and IIT Bombay introduction
  * Multi-delivery system architecture with data flows and ingestion pipelines
  * Comprehensive Related Work and Literature Review (WebAgent, Mind2Web, FormNet)
  * Phase 7 benchmark results (Rule-based: 57.66%, LLM-structured: 71.35%, MCP: 62.38%)
  * Scorer bug diagnosis and resolution impact (+6-13% accuracy hidden)
  * Production recommendations and hybrid neuro-symbolic pipeline design
* **When to read:** For comprehensive technical understanding and academic reproduction context.

---

### 2. Getting Started & Setup

#### [LOCAL-LLM-SETUP.md](./LOCAL-LLM-SETUP.md)
* **Primary audience:** Developers setting up local inference
* **Content:**
  * Ollama installation and tags check
  * Model specifications (recommending `qwen2.5:7b` / `llama3.2:3b`)
  * Model compatibility warnings (warning against `gemma3` tool-calling issues)
  * Environment variable config and Flask server execution instructions
  * Troubleshooting tips (RAM caps, CPU-only latency, dummy API keys)
* **When to read:** To execute agents locally without API subscription costs.

#### [TESTING.md](./TESTING.md)
* **Primary audience:** Developers, QA engineers
* **Content:**
  * Playwright benchmark runner files and locations
  * Quick and full ablation scripts
  * Normalization rules (dates, float equivalent, dropdown display labels)
* **When to read:** When updating agent code, adding forms, or debugging test scores.

---

### 3. Surface-Specific Guides

#### [WebPortal.md](./WebPortal.md)
* **Primary audience:** Portal developers, full-stack engineers
* **Content:**
  * Next.js pages and app folder layout
  * PDF/DOCX upload parser API details
  * Scraper and filler modules (Playwright)
  * **Matching Engine Optimization:** 3-tier matcher logic (Type-Aware rules $\to$ Name heuristics $\to$ Local Embeddings similarity)
  * Direct track test results on httpbin (100% accuracy in 1.9s)
* **When to read:** When expanding web-portal capabilities or backend mappings.

#### [VISION-AGENTS.md](./VISION-AGENTS.md)
* **Primary audience:** Vision researchers, multimodal engineers
* **Content:**
  * `vision-agent` vs `vlm-agent` architecture
  * Bounding box predictions and visual grounding coordinates
  * Ruler overlay grid injection to improve VLM grounding
  * Multimodal model requirements (Google Gemini, OpenAI GPT, local Qwen-VL/Llava)
* **When to read:** When designing agents for forms with complex visual structures (iframes, Canvas, Shadow DOM).

---

## Learning Path

```
               [README.md] (Root Project Overview)
                       │
                       ▼
        [LOCAL-LLM-SETUP.md] (Ollama & Model Install)
                       │
                       ▼
         [TESTING.md] (Playwright CLI Run Commands)
                       │
                       ▼
        [reports/Report.md] (Canonical Research Study)
          /            │            \
         /             │             \
        ▼              ▼              ▼
  [WebPortal.md]  [VISION-AGENTS.md]  [GEMINI-INTEGRATION...]
  (NextJS back)   (Multimodal VLM)   (Gemini API Docs)
```

---

## File Size Reference

| Document | Size (KB) | Purpose |
|---|---|---|
| `README.md` (root) | ~17.1 KB | Repository index, overview, and quick-start |
| `reports/Report.md` | ~16.5 KB | Detailed research paper |
| `WebPortal.md` | ~6.5 KB | Web portal specs & matching optimization |
| `LOCAL-LLM-SETUP.md` | ~5.3 KB | Ollama local model guides |
| `VISION-AGENTS.md` | ~3.8 KB | Visual coordinate VLM notes |
| `TESTING.md` | ~3.0 KB | Testing harness details |
| `IMPLEMENTATION-HISTORY.md` | ~15.5 KB | Change log record |
| `GEMINI-INTEGRATION-DOCUMENTATION.md` | ~10.0 KB | Gemini API guide |
| `MCP-ISSUE-DIAGNOSIS.md` | ~7.8 KB | Authentication diagnostics |
