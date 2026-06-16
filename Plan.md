Form-Filling Agents — Current state & next actions

Status summary (Updated June 16, 2026):
- **Documentation**: Consolidated under Documentation/README.md. `Bedrock-setup.md`, `API_setup.md`, and `07-MODEL-SELECTION.md` updated with the latest native Bedrock configuration guides and dummy-key warnings.
- **Shared Utilities**: `shared/cost-model.ts` and `shared/scorer.ts` (unified cost + metrics) are active.
- **Implementations**:
  - **Extension**: Ablation harness active (emits JSONL).
  - **Web-portal**: Fully active. Native Bedrock Converse SDK integration completed and `.env` auth fallback issues resolved.
  - **MCP**: `playwright-mcp` updated with the native Bedrock loop.
- **Aggregator**: `scripts/aggregate-ablation.ts` combines JSONL logs into `Documentation/ABLATION-MASTER-REPORT.md`.

Quick validation (smoke) steps:
1) Start FormFactory server: `cd C:\Code\formfactory && pip install -r requirements.txt && python app.py`
2) Extension quick ablation: `cd C:\Code\FFA\extension && npx tsx scripts/ablation-study.ts --quick`
3) Web-portal quick benchmark: `cd C:\Code\FFA\web-portal && NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx benchmark.ts --instances 1`
4) MCP quick run: `cd C:\Code\FFA\mcp-implementations\shared && npx tsx runner.ts --impls playwright-mcp --runs 1`
5) Aggregate results: `cd C:\Code\FFA && npx tsx scripts/aggregate-ablation.ts`

**Next priority tasks (Immediate):**
1. **MCP Value-Accuracy Wiring**: Wire `playwright-mcp` to intercept Playwright tool call arguments (e.g., `playwright_fill`) and return an array of filled values (`FieldFill[]`). Update `FillResult` to hold this so `shared/scorer.ts` can calculate value-accuracy parity.
2. **Pricing Model Update**: Update `shared/cost-model.ts` with accurate pricing for `qwen.qwen3-235b-a22b-2507-v1:0` (and remove placeholders for Claude if actual Bedrock prices are known).
3. **Smoke Sweep (N=1)**: Run a provider sweep across all tracks for native Bedrock (`qwen.qwen3-235b`), OpenAI, and Cerebras/Ollama to validate parity across models and tracks.
4. **Full Benchmark Run (N>=5)**: Execute and aggregate a complete test suite for the headline ablation report once the N=1 sweep is validated.

**Medium/Long-Term Tasks (Extended Plan):**
1. **Implement `browser-mcp`**: Build out the scaffolded `mcp-implementations/browser-mcp` track, establishing a Chrome extension bridge that allows an MCP server to drive the user's actual browser session (unlike Playwright's headless execution).
2. **Implement `skyvern-mcp`**: Hook up the scaffolded Skyvern MCP (vision-first) and adapt its goal-oriented prompt structure to the current benchmark runner.
3. **Shared Provider Abstraction**: Implement a centralized `chatCompletion()` and `embeddings()` package (as noted in `API_setup.md`) to deduplicate the fallback, API key handling, and client instantiation logic currently living independently inside `web-portal`, `extension`, and `playwright-mcp`.