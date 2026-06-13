# Local LLM Setup & Benchmark Guide

This guide details the setup and execution commands required to run the Form-Filling Agents and benchmarks locally using **Ollama**.

---

## 1. Prerequisites

1. **Node.js** (v18 or higher)
2. **Python** (v3.10 or higher) - for the FormFactory Flask server
3. **Ollama** installed on your system (download from [ollama.ai](https://ollama.ai) or run `brew install ollama` on macOS)

---

## 2. Step-by-Step Installation & Setup

### Step 2.1: Verify Ollama Installation

Ensure Ollama is running and accessible:
```bash
ollama --version  # Should show v0.12.11 or later
curl http://localhost:11434/api/tags  # Verify model list response
```

### Step 2.2: Pull a Compatible Tool-Calling Model

The `mcp-agent` requires a model that supports tool calling.

```bash
# Recommended default: qwen2.5:7b (4.7 GB, best speed/accuracy balance)
ollama pull qwen2.5:7b

# Alternative: llama3.2:3b (2.0 GB, smaller footprint, slightly slower inference)
ollama pull llama3.2:3b
```

> [!WARNING]
> **Model Incompatibility**  
> Google Gemma models (e.g. `gemma3:12b`, `gemma3:27b`) do **NOT** support standard OpenAI-compatible tool calling in Ollama. Attempting to use them will trigger a `400: does not support tools` error. Stick to `qwen2.5:7b` or `llama3.2:3b` for the MCP agent.

---

## 3. Configuration (.env)

Ensure your configuration files are set up in both the extension and the MCP directory.

### Extension Track Configuration

Copy the example file to `.env` in `extension/` and configure the Ollama provider:
```env
# extension/.env
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5:7b
OLLAMA_BASE_URL=http://localhost:11434/v1
```

### MCP Track Configuration

Edit `mcp-implementations/playwright-mcp/.env`:
```env
# mcp-implementations/playwright-mcp/.env
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=qwen2.5:7b
MAX_TURNS_PER_FORM=20
MCP_BROWSER_CHANNEL=chrome
```
*Note: No API key is required when pointing to localhost; the client factory will automatically set a dummy key.*

---

## 4. Run the FormFactory Benchmark Server

The benchmark requires the real Python FormFactory Flask server to serve the HTML form templates.

```powershell
# Open a new terminal window
cd C:\Code\formfactory

# Install Python requirements
pip install -r requirements.txt

# Start the Flask Server
python app.py
```
*(Keep this terminal running. The server should be accessible at `http://localhost:5000`)*

---

## 5. Running the Benchmarks

Once Ollama is running and the Flask server is active, you can execute the benchmarks.

```powershell
cd C:\Code\Form-Filling-Agents\extension

# 1. Rule-Based baseline (fast, no LLM)
npm run benchmark:rule-based:quick  # 25 forms
npm run benchmark:rule-based:full   # 1250 forms

# 2. LLM-Structured agent (single-shot JSON)
npm run benchmark:llm-structured:quick

# 3. MCP Agent (iterative tool-calling loop)
npm run benchmark:mcp-agent:quick
npm run benchmark:mcp-agent:full

# 4. Master Ablation Runner (runs all agents sequentially)
npm run ablation:quick
```

---

## 6. Testing the MCP CLI Directly

To test the MCP playwright agent on a single form (independent of the benchmark orchestrator):

```bash
cd mcp-implementations/playwright-mcp
npx tsx src/index.ts fill \
  --url https://httpbin.org/forms/post \
  --profile ../shared/user-profile.json
```

---

## 7. Model Compatibility & Performance Reference

| Model | Size | Tool-Calling | Recommended Use | Notes |
|---|---|---|---|---|
| **qwen2.5:7b** | 4.7 GB | ✅ Yes | **Yes (Default)** | Best balance of speed and structured accuracy |
| **llama3.2:3b** | 2.0 GB | ✅ Yes | Yes (Low-RAM) | Lightweight, but slightly slower inference |
| **gemma3:12b** | 8.1 GB | ❌ No | ❌ No | Triggers `400 does not support tools` error |
| **gemma3:27b** | 17 GB | ❌ No | ❌ No | Too large + lacks tool calling support |

---

## 8. Troubleshooting Local Setup

### Error: `does not support tools`
* **Cause:** The active model does not support OpenAI-compatible tool calling.
* **Solution:** Pull and switch to `qwen2.5:7b` in your `.env` file.

### Error: `model requires more system memory`
* **Cause:** Your system doesn't have enough RAM for the model (e.g. running 7B on a 4GB system).
* **Solution:** Switch to `llama3.2:3b` or close RAM-intensive applications like Chrome or Docker.

### Error: `No API key found`
* **Cause:** `.env` file is missing or contains incorrect URLs.
* **Solution:** Ensure `LLM_BASE_URL` is configured to `http://localhost:11434/v1`. The agent detects `localhost` and bypasses API key checks automatically.

### Extremely Slow Inference (>2 min/form)
* **Cause:** The model is running on CPU because GPU acceleration is not configured or available.
* **Solution:** Check Ollama server logs to confirm GPU delegation. Swapping to `llama3.2:3b` can improve speed on CPU. For production speeds, switch to an external API (like OpenAI `gpt-4o-mini` or Google `gemini-1.5-flash`).
