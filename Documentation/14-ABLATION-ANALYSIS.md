# 14. Ablation Analysis (Theoretical Pre-computation)

This document provides a theoretical breakdown of the 15 combinations of tracks and agents to help you understand expected **cost, performance, execution time, and shortcomings** without running the entire exhaustive matrix. This allows you to select the best candidates to test in the future, avoiding unnecessary token and time expenditure.

## Tracks Overview

1. **Extension**: In-browser execution. Uses background service workers and content scripts. Accesses the DOM securely and interacts directly via JavaScript injection. 
2. **Web Portal**: Server-side proxy execution. Uses a headless browser (Playwright) via a central server endpoint. Scrapes all inputs at once.
3. **MCP**: Agent-driven protocol execution. Uses `playwright-mcp` tools where an LLM is expected to call commands (`evaluate_script`, `click`, `fill_field`) interactively to navigate forms.

---

## Agent Ablations

### 1. Rule-Based (Heuristics & Regex)
**Concept**: Matches field names/IDs using regex and predefined mappings to user profile data.
- **Cost**: $0.00 (Local/Free)
- **Time**: ~0.05s per form (Instant)
- **Performance (Accuracy)**: ~40-60%. Excellent on standardized forms, fails on ambiguous or highly dynamic fields.
- **Shortcomings**: Cannot understand context. Fails on non-standard naming conventions (e.g., `<input id="field_342">` with a `<span>` label next to it). Cannot infer missing data cleanly.

### 2. Embedding-Matcher (Semantic Similarity)
**Concept**: Converts both the field label and user profile keys to dense vectors (e.g., using a local SentenceTransformer) and pairs the closest matches via cosine similarity.
- **Cost**: $0.00 (Local/Free)
- **Time**: ~0.5s per form (Fast)
- **Performance (Accuracy)**: ~65-75%. Better than rule-based at understanding synonyms (e.g., "Given Name" matches "First Name").
- **Shortcomings**: Weak at formatting requirements (e.g., date formats). Sometimes incorrectly maps semantically similar but logically distinct fields (e.g., "Spouse's Name" vs "Your Name").

### 3. LLM-Structured (Single-Shot Prompt)
**Concept**: Sends the entire serialized form schema and the user profile to an LLM, requesting a single JSON object mapping field IDs to values.
- **Cost**: Medium-High. Depends heavily on the model used. (e.g., $0.00015 / 1k input for gpt-4o-mini; Cerebras ~ $0.10 / 1M). ~2k-4k tokens per form. 
- **Time**: ~1-3s (Provider dependent; Cerebras is significantly faster, <0.5s).
- **Performance (Accuracy)**: ~85-95%. Highly accurate. Can format dates, infer missing contexts, and match complex schemas.
- **Shortcomings**: Context window bloat for very large forms. Susceptible to hallucinating field IDs if the schema is complex.

### 4. Hybrid (Cascade: Rule -> Embedding -> LLM)
**Concept**: Tries rule-based first. If confidence is low, falls back to embeddings. If still unresolved or complex, selectively escalates only those remaining fields to an LLM.
- **Cost**: Low. (~10-20% of pure LLM cost)
- **Time**: ~0.2s - 1s per form.
- **Performance (Accuracy)**: ~85-95%. Achieves near-LLM accuracy but vastly cheaper and faster.
- **Shortcomings**: Requires complex threshold tuning. If the rule-based logic is overly confident but wrong, the error persists without the LLM getting a chance to correct it.

### 5. VLM-Agent (Vision Language Model)
**Concept**: Takes a screenshot of the viewport (or entire page) alongside the DOM schema. Uses a vision-capable LLM to visually map fields to user data.
- **Cost**: Very High. Vision tokens are expensive (e.g., 1 high-res image = ~1k-3k extra tokens). 
- **Time**: ~3-6s per form. (Image encoding and multimodal inference latency).
- **Performance (Accuracy)**: ~90-98%. Best possible accuracy. Resolves visual layouts (e.g., checkboxes next to text, modal overlays, visually hidden fields).
- **Shortcomings**: Expensive and slow. Overkill for standard web forms. Requires multimodal model support (e.g., gpt-4o, gemini-1.5-pro, or visual open-source models).

---

## Cross-Matrix Interactions

| Track | Rule-Based | Embedding-Matcher | LLM-Structured | Hybrid | VLM-Agent |
|-------|------------|-------------------|----------------|--------|-----------|
| **Extension** | Perfect fit. Fast. | Good, but needs a local embedder (WASM) or external API. | Excellent. DOM serialization is clean. | **Optimal Choice**. Balances cost and speed in-browser. | Limited by extension sandbox (needs background screenshot APIs). |
| **Web Portal** | Server-side DOM parsing works well. | Easy to host embedding models on the server. | Good, but scraping dynamic forms is harder than via extension. | Excellent. | Very easy to implement via Playwright screenshots. |
| **MCP** | Not applicable/Overkill. Hard to write rules for interactive tools. | Hard to map embeddings to interactive tool steps. | Works well for iterative tool calling. | Complex to coordinate tool calling thresholds. | **Best Fit**. VLM can "see" the browser state and call `click` or `fill` natively. |

## Recommendation

To maximize efficiency and minimize wasted tokens/time:
1. **For the Extension**: Run the **Hybrid** agent. It provides the best UX (speed) while remaining cost-effective for daily user operation.
2. **For the MCP**: Run the **LLM-Structured** or **VLM-Agent**. MCP is inherently interactive and agentic; pure rule-based logic fundamentally conflicts with the model-context-protocol paradigm.
3. **For Cerebras Testing**: Cerebras excels at extreme token throughput. Test the **LLM-Structured** agent on Cerebras across all forms. The speed will rival rule-based systems while offering LLM intelligence, potentially rendering the "Hybrid" complexity unnecessary if token costs remain negligible.
