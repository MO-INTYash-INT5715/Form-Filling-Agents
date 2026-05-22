# Form-Filling Agents: Literature Review & Theoretical Framework

## 1. Problem Definition
The task of automated form-filling requires mapping unstructured data (e.g., resumes, emails) to structured web forms. This involves two distinct cognitive tasks:
1. **Information Extraction**: Identifying the correct value from an unstructured document.
2. **Visual Grounding / DOM Resolution**: Identifying the correct interactive HTML element (input, select, checkbox) that corresponds to the extracted field.

## 2. Implementation Archetypes

Where do these implementations make a difference? The difference lies in how they handle **DOM Resolution**.

### A. Rule-Based Heuristic Agent
- **Methodology**: Uses Regex/NLP to extract values, and simple substring matching to find `<input>` elements with matching `name` or `id` attributes.
- **Strengths**: Extremely fast, zero token cost, deterministic.
- **Weaknesses**: Brittle. Fails if form labels don't strictly match extraction keys or if DOM is obfuscated (e.g., React auto-generated IDs).
- **Expected Output**: ~10-20% value accuracy, very low click accuracy on complex DOMs.

### B. DOM-Parsing LLM Agent
- **Methodology**: Parses the HTML into an Accessibility Tree or simplified Markdown DOM. Passes the DOM + Input Document to an LLM (Claude/GPT-4).
- **Strengths**: Understands semantic context (e.g., knowing that a field labeled "Given Name" maps to the "First Name" input).
- **Weaknesses**: High token usage. Can hallucinate DOM nodes or fail on highly dynamic SPAs.
- **Expected Output**: ~70-80% accuracy.

### C. Vision-Language Model (VLM) Agent
- **Methodology**: Takes screenshots of the page with overlaid bounding boxes (Set-of-Mark prompting). Asks VLM (e.g., GPT-4o) to output the bounding box ID to click/type.
- **Strengths**: True human-like visual understanding. Unaffected by DOM obfuscation.
- **Weaknesses**: High latency, high cost, struggles with long scrolling forms.
- **Expected Output**: ~85% accuracy.

### D. Generalized MCP Agents (BrowserMCP / PlaywrightMCP)
- **Methodology**: Delegates the entire task to an external MCP tool server. The model uses tools like `navigate`, `click`, `fill` iteratively.
- **Strengths**: Can handle multi-step flows, error recovery, and dynamic popups natively.
- **Weaknesses**: Very high latency (multiple LLM turn roundtrips per field). Prone to agentic loops (getting stuck). Harder to benchmark synchronously.
- **Expected Output**: High accuracy but extremely high execution time per form.

## 3. The Best Theoretical Implementation
The optimal solution is a **Hybrid Neuro-Symbolic Agent**.
1. **Input Pipeline (Neuro)**: An LLM parses the `inputDocument` once into a strict JSON schema.
2. **DOM Simplification (Symbolic)**: A lightweight script extracts only interactive elements from the DOM into a minimal graph.
3. **Semantic Mapping (Neuro)**: An LLM maps the JSON keys to the DOM graph IDs in a single prompt.
4. **Execution (Symbolic)**: Playwright rapidly executes the JSON-to-DOM mapping.

This provides the accuracy of LLMs with the speed and reliability of programmatic execution, avoiding the slow feedback loop of MCP-style step-by-step agents.

## 4. Pipeline Process Flow
1. **Data Ingestion**: Unstructured text is provided.
2. **Agent Hand-off**: The selected implementation (Rule-based, VLM, MCP) takes control.
3. **Execution**: The agent interacts with the `localhost:5000` Flask benchmark server.
4. **Scoring**: The Flask server evaluates the submission against the `goldAnswers`.
5. **Reporting**: Metrics are saved for comparative analysis.
