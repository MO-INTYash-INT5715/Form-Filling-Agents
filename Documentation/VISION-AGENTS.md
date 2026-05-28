# Vision & VLM Agent — Implementation Notes

**Status:** Implemented but requires a **multimodal (vision-capable) model**. Cannot run with `qwen2.5:7b` (text-only).

---

## What They Do

### `vision-agent`
Single-turn visual agent. Takes a screenshot of the form page, sends it as a base64 image to a multimodal LLM (GPT-4o, Claude 3.5, etc.), and receives a list of `click(x,y)` + `type(text)` actions to execute via Playwright.

### `vlm-agent`
More robust multi-turn visual agent with:
- **Ruler injection** — overlays a pixel-grid ruler onto the page before screenshotting, helping the VLM reason about coordinates
- **3-turn loop** — allows correction if the first pass misses fields
- Structured action format with explicit fills array

---

## Why They're Not Benchmarked Here

The FormFactory benchmark runs on `qwen2.5:7b` via Ollama, which is a **text-only** model. Sending image content to it returns an error:

```
400: model does not support multimodal input
```

Vision agents are architecturally sound but need one of:

| Model | Provider | Approx Cost |
|-------|----------|-------------|
| `gpt-4o` | OpenAI | ~$5/1M in, $15/1M out |
| `gpt-4o-mini` | OpenAI | ~$0.15/1M in, $0.60/1M out |
| `claude-3-5-sonnet` | Anthropic | ~$3/1M in, $15/1M out |
| `qwen2.5vl:7b` | Ollama (local) | $0 |
| `llava:13b` | Ollama (local) | $0 |
| `llava:34b` | Ollama (local) | $0 |

---

## How to Enable

### Option A: Ollama Vision Model (Free, Local)
```bash
ollama pull qwen2.5vl:7b   # ~5GB
# or
ollama pull llava:13b       # ~8GB
```

Set in `extension/.env`:
```
LLM_PROVIDER=ollama
LLM_MODEL=qwen2.5vl:7b
OLLAMA_BASE_URL=http://localhost:11434/v1
```

### Option B: OpenAI GPT-4o
```
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

### Run the Benchmark
```bash
npx tsx scripts/run-benchmark.ts --agent vision-agent --quick
npx tsx scripts/run-benchmark.ts --agent vlm-agent --quick
```

---

## Known Limitations

1. **Coordinate precision** — VLMs often hallucinate pixel coordinates for elements they can't clearly see. The ruler in `vlm-agent` mitigates this.
2. **Single-page assumption** — Neither agent handles multi-page forms natively (requires explicit page-turn detection).
3. **Submit action** — `vision-agent` relies on the LLM to emit a `submit` action; `vlm-agent` does an explicit button scan after the loop.
4. **Token cost** — Vision agents are 5–20x more expensive per form than text agents due to image tokens (~1000 tokens per screenshot).

---

## Projected Performance (Estimated)

Based on comparable VLM-on-forms benchmarks in literature:

| Agent | Est. Value Acc | Est. Tokens/Form | Notes |
|-------|---------------|-------------------|-------|
| vision-agent (gpt-4o) | ~45–60% | ~3,000–8,000 | Coordinate errors on dense forms |
| vlm-agent (gpt-4o) | ~55–70% | ~5,000–12,000 | Ruler helps; 3-turn loop recovers misses |
| vlm-agent (qwen2.5vl) | ~35–50% | ~4,000–10,000 | Local but less capable |

These are estimates — actual numbers require running the benchmark with a vision model.
