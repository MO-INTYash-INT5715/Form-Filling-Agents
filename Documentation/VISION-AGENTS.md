# Multimodal Vision & VLM Agent Guide

This document covers the implementation, configuration, and evaluation of vision-capable (multimodal) form-filling agents.

---

## 1. Vision Agent Archetypes

We implement two vision-based agent strategies designed to handle complex forms (such as those containing dynamic JS, iframes, Canvas elements, or Shadow DOMs) that confuse text-based DOM parsers.

### `vision-agent`
A single-turn visual agent:
1. Takes a viewport screenshot of the current page.
2. Sends the base64-encoded image along with the user profile to a multimodal LLM (Gemini, OpenAI, or Claude).
3. The LLM returns a JSON list of coordinate-based `click(x, y)` and `type(x, y, text)` actions.
4. Playwright executes the actions sequentially and triggers form submission.

### `vlm-agent`
A robust, multi-turn visual agent incorporating:
* **Ruler Overlay:** Temporarily overlays a colored pixel-grid ruler onto the viewport prior to capturing the screenshot. This grid helps the VLM reason about visual coordinates and reduces coordinate hallucination.
* **3-Turn Feedback Loop:** Re-evaluates the form after filling it. If fields were missed or filled incorrectly, the agent plans correction steps in subsequent turns (up to a maximum of 3 turns).
* **Button Scan:** Programmatically scans for the submit button at the end of the loop rather than relying solely on LLM submit action predictions.

---

## 2. Model Requirements & Compatibility

The standard FormFactory benchmark runs on text-only models like `qwen2.5:7b` via local Ollama. Text models will fail on vision benchmarks with an error:
```
400: model does not support multimodal input
```

To run vision-based agents, configure one of the following compatible models:

| Model | Provider | Cost (Est. per 1M Input/Output Tokens) | Notes |
|---|---|---|---|
| `gemini-1.5-flash` | Google | \$0.075 / \$0.30 | **Recommended default** (very fast, cheap, 1M context) |
| `gpt-4o-mini` | OpenAI | \$0.150 / \$0.60 | Very strong, fast alternative |
| `claude-3-5-sonnet` | Anthropic | \$3.000 / \$15.00 | Highest grounding accuracy, but expensive |
| `qwen2.5vl:7b` | Ollama (Local) | \$0.00 | Free, local, requires strong CPU/GPU |
| `llava:13b` | Ollama (Local) | \$0.00 | Free, local alternative |

---

## 3. How to Enable Vision Agents

### Option A: Google Gemini API (Recommended)

Edit `extension/.env`:
```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=AIzaSy...
LLM_MODEL=gemini-1.5-flash
```

### Option B: OpenAI GPT-4o Mini

Edit `extension/.env`:
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
LLM_MODEL=gpt-4o-mini
```

### Option C: Local Ollama Vision

1. Pull the local multimodal model:
   ```bash
   ollama pull qwen2.5vl:7b
   ```
2. Edit `extension/.env`:
   ```env
   LLM_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434/v1
   LLM_MODEL=qwen2.5vl:7b
   ```

---

## 4. Run the Vision Benchmarks

From the `extension/` directory, execute:

```powershell
# Run the vision-agent benchmark (quick mode: 1 instance per form)
npm run benchmark:vision-agent:quick

# Run the vlm-agent benchmark (quick mode: 1 instance per form)
npm run benchmark:vlm-agent:quick
```

---

## 5. Known Limitations & Projected Performance

### Limitations
1. **Coordinate Precision:** VLMs can hallucinate pixel coordinates on very dense form layouts. The pixel ruler in `vlm-agent` mitigates this but does not eliminate it.
2. **Single-Page Assumption:** Neither agent handles multi-page forms natively (requires manual/explicit step transition prompting).
3. **Token Consumption:** Vision agents consume 5–20x more tokens than text-based agents due to image tokenization (~1,000 to 1,500 tokens per screenshot).

### Performance Estimates
Based on comparative evaluations of Vision Language Models (VLMs) on form layouts:

| Agent | Est. Value Accuracy | Est. Input Tokens/Form | Notes |
|---|---|---|---|
| `vlm-agent` (gpt-4o / Gemini Pro) | **55 - 70%** | 5,000 - 12,000 | Multi-turn feedback loop corrects errors; ruler helps alignment |
| `vision-agent` (gpt-4o / Gemini Pro) | **45 - 60%** | 3,000 - 8,000 | Single-shot; coordinate errors on dense forms |
| `vlm-agent` (qwen2.5vl:7b) | **35 - 50%** | 4,000 - 10,000 | Local and free, but grounding is less precise |

---

## 6. Academic Reference

The benchmark infrastructure is grounded in the methodology established by:
* B. Li et al., *"FormFactory: An Interactive Benchmarking Suite for Multimodal Form-Filling Agents"*, arXiv:2506.01520.
* J. Yang et al., *"Set-of-Mark Prompting Unleashes Extraordinary Visual Grounding in GPT-4V"*, arXiv:2310.11441.
