# Running Local LLM & Benchmarks

This guide details the commands necessary to run the entire pipeline locally, leveraging **Ollama** and the **gemma3:12b** model for the MCP Agent and Data Parser integrations.

## 1. Environment Setup

First, initialize your environment variables:
```powershell
Copy-Item .env.example .env
```
Ensure your `.env` has the following config (this is the default):
```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
LLM_MODEL=gemma3:12b
```

> [!TIP]
> **Upgrading to 27B Parameters**
> If you upgrade your system RAM (the 27B model requires ~23 GiB, while the 12B model requires ~8 GiB), you can switch to the larger model for better reasoning. 
> 1. Run `ollama pull gemma3:27b`
> 2. Change your `.env` file to: `LLM_MODEL=gemma3:27b`

## 2. Start the FormFactory Benchmark Server

The benchmark requires the real Python FormFactory Flask server to be running in the background to serve the 40+ HTML forms.

```powershell
# Open a new terminal window
cd C:\Code\formfactory
# Install Python requirements if you haven't yet
pip install -r requirements.txt
# Start the Flask Server
python app.py
```
*(Leave this terminal running. The server should be accessible at `http://localhost:5000`)*

## 3. Run Ollama Locally

Ensure the Ollama service is running. If you haven't pulled the model yet, or need to start the inference engine:

```powershell
# Open a new terminal window
ollama serve

# If you need to pull the model manually (already done if you followed setup)
ollama pull gemma3:12b
```
*(Ollama listens on port 11434 by default)*

## 4. Execute the Benchmark

With the Flask server and Ollama both running, you can now run the TypeScript agents!

To evaluate the Rule-Based Baseline (no LLM):
```powershell
cd C:\Code\Form-Filling-Agents
npm run benchmark:rule-based:quick  # 25 forms (fast)
npm run benchmark:rule-based:full   # 1250 forms
```

To evaluate the MCP Local LLM Agent (uses gemma3:12b):
```powershell
cd C:\Code\Form-Filling-Agents
npm run benchmark:mcp-agent:quick   # 25 forms (fast)
npm run benchmark:mcp-agent:full    # 1250 forms
```

### Metrics Expected
- The benchmark runner will interact with the local DOM via Playwright.
- The `MCPAgent` will iteratively query `gemma3:12b` with the current DOM state to predict the next clicks and keystrokes.
- Upon form submission, the `playwright-executor` will compare the agent's actions against the gold-standard answers in the FormFactory dataset and report `Value Accuracy` and `Click Accuracy`.
