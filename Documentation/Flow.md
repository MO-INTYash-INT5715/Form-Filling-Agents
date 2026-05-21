# Form Filling Agent — Full Pipeline & Implementation Flow

> Last updated: 2026-05-21
> Reference: [FormFactory Paper](https://arxiv.org/abs/2506.01520)

---

## 1. System Overview

This document maps the complete pipeline of how form filling works end-to-end, from raw input data to evaluated results, and describes how each planned implementation strategy slots into the system.

---

## 2. High-Level Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FORM FILLING AGENT SYSTEM                           │
└─────────────────────────────────────────────────────────────────────────────┘

  ╔═══════════════════╗       ╔══════════════════════╗       ╔══════════════╗
  ║  INPUT PIPELINE   ║──────▶║  AGENT / STRATEGY    ║──────▶║  EXECUTOR   ║
  ║  (Data Parsing)   ║       ║  (Form Filling Logic) ║       ║  (DOM Fill) ║
  ╚═══════════════════╝       ╚══════════════════════╝       ╚══════════════╝
           │                             │                           │
           │                             │                           │
           ▼                             ▼                           ▼
  ╔═══════════════════╗       ╔══════════════════════╗       ╔══════════════╗
  ║  Structured Data  ║       ║  Field→Value Mapping  ║       ║   Browser   ║
  ║  (JSON schema)    ║       ║  { fieldId: value }   ║       ║   Page DOM  ║
  ╚═══════════════════╝       ╚══════════════════════╝       ╚══════════════╝
                                                                      │
                                                                      ▼
                                                     ╔══════════════════════════╗
                                                     ║    BENCHMARK HARNESS     ║
                                                     ║  Click Acc / Value Acc   ║
                                                     ║  Form Completion Rate    ║
                                                     ╚══════════════════════════╝
```

---

## 3. Stage-by-Stage Breakdown

### Stage 1 — Input Pipeline  *(future: State-of-the-Art Data Parser)*

The **Input Pipeline** is responsible for taking raw user data (in any format) and converting it into a normalised, structured JSON object that all agent implementations can consume uniformly.

```
Raw User Data
  │
  ├── Plain Text / Resume / PDF document
  ├── JSON / YAML user profile
  ├── Browser-stored profile (chrome.storage)
  ├── Clipboard content
  └── Voice / natural-language description
  │
  ▼
┌─────────────────────────────────────────────────────┐
│               INPUT PIPELINE  (placeholder)          │
│                                                      │
│  • Document parser (PDF, DOCX, HTML)                 │
│  • Entity extractor (NER / LLM-based)                │
│  • Schema normalizer → UserProfile JSON              │
│  • PII redactor / consent gate                       │
└─────────────────────────────────────────────────────┘
  │
  ▼
Structured UserProfile {
  name, email, phone, address,
  company, role, education, …
}
```

> **Note:** The Input Pipeline is intentionally decoupled. Any state-of-the-art parser (e.g. a local LLM, a resume parser, or a cloud NER service) can be plugged in here without affecting downstream agent logic.

---

### Stage 2 — Form Detection (Content Script)

Runs inside the browser page via the **Content Script** (`src/content/content-script.ts`).

```
Browser Page (target form)
  │
  ├── MutationObserver watches DOM changes
  ├── querySelectorAll('form') → finds all <form> elements
  ├── extractFormFields()
  │     ├── inputs, textareas, selects
  │     ├── skips hidden / submit fields
  │     └── resolves <label> associations (for / parent / aria-labelledby)
  └── builds FormContext[]  { url, title, fields[] }
  │
  ▼
FormContext {
  url, title,
  fields: [ { element, type, name, id, label, placeholder, value } ]
}
```

---

### Stage 3 — Agent / Strategy Layer

This is the **core differentiation layer**. Multiple independent strategies consume the same `FormContext` + `UserProfile` and each produce a `FieldValueMapping`.

```
FormContext  +  UserProfile
      │
      ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      AGENT STRATEGY SELECTOR                            │
│          (checks isApplicable(), routes to correct implementation)      │
└─────────────────────────────────────────────────────────────────────────┘
      │
      ├──▶ [IMPL-1] Rule-Based DOM Inference       (src/implementations/rule-based/)
      ├──▶ [IMPL-2] Embedding / Semantic Matcher   (src/implementations/embedding-matcher/)
      ├──▶ [IMPL-3] VLM / Multimodal Agent         (src/implementations/vlm-agent/)
      ├──▶ [IMPL-4] LLM Structured Output Agent    (src/implementations/llm-structured/)
      └──▶ [IMPL-5] Hybrid (DOM + VLM fallback)    (src/implementations/hybrid/)
      │
      ▼
FieldValueMapping  { fieldId → value, … }
```

Each implementation is **fully isolated** in its own folder (see Section 5).

---

### Stage 4 — Executor (FormFiller)

Shared across all implementations. Receives the `FieldValueMapping` and applies interactions to the live DOM.

```
FieldValueMapping
  │
  ▼
FormFiller (src/utils/form-filler.ts)
  │
  ├── text / textarea  → element.value = value  +  input event
  ├── select           → set selectedIndex / value
  ├── checkbox         → element.checked = (value === 'true')
  ├── radio            → find matching option, click
  ├── date             → set value, fire change event
  └── file             → flag for human-in-loop (can't auto-fill file inputs)
  │
  ▼
FillingResult { success, fieldsModified, message, timestamp }
```

---

### Stage 5 — Benchmark Harness

After execution, results flow into the **FormFactory Benchmark** for reproducible evaluation.

```
FillingResult  +  GroundTruth (FormFactory dataset)
  │
  ▼
┌─────────────────────────────────────────────────────┐
│              BENCHMARK HARNESS                       │
│  src/benchmark/                                      │
│                                                      │
│  test-runner.ts       → orchestrates test cases      │
│  evaluation-metrics.ts → computes metrics            │
│  benchmark-analyzer.ts → aggregates + reports        │
│  benchmark-config.ts  → scenarios & flags            │
│  formfactory-dataset.ts → 25 forms, 13,800 pairs     │
└─────────────────────────────────────────────────────┘
  │
  ▼
Metrics per Implementation:
  • Click Accuracy     (% of correct element interactions)
  • Value Accuracy     (% of correct field values)
  • Form Completion    (end-to-end success rate)
  • Domain Breakdown   (Academic / Finance / Healthcare / …)
```

---

## 4. Message Flow (Extension Architecture)

```
User clicks "Fill Form"
        │
        ▼
  [Popup UI]  ──── chrome.runtime.sendMessage(FILL_FORM) ────▶  [Background Service Worker]
                                                                          │
                                                           sendMessageToContentScript(tabId)
                                                                          │
                                                                          ▼
                                                                 [Content Script]
                                                                          │
                                                               detectForms() → FormContext
                                                                          │
                                                               AgentSelector.route()
                                                                          │
                                                               Implementation.analyze()
                                                                          │
                                                               FormFiller.fillForm()
                                                                          │
                                                                          ▼
                                                                   FillingResult
                                                                          │
                                                           sendResponse back up the chain
                                                                          │
                                                                          ▼
                                                                [Popup UI] shows result
```

---

## 5. Implementation Catalogue

Each method lives in its own **isolated folder** under `src/implementations/`. No shared agent logic; only shared utilities (`src/utils/`, `src/types/`, `src/benchmark/`).

| # | Name | Folder | Status | Description |
|---|------|--------|--------|-------------|
| 1 | **Rule-Based DOM Inference** | `src/implementations/rule-based/` | ✅ Baseline (implemented) | Keyword pattern matching on field `name`, `id`, `label`, `placeholder`. Fast, zero-model, offline. |
| 2 | **Embedding / Semantic Matcher** | `src/implementations/embedding-matcher/` | 🔲 Planned | Encodes field labels + user profile fields as embeddings, finds nearest-neighbour match. Uses a small local embedding model (e.g. `all-MiniLM`). |
| 3 | **VLM / Multimodal Agent** | `src/implementations/vlm-agent/` | 🔲 Planned | Takes a screenshot of the form, passes it to a Vision-Language Model (GPT-4o / Gemini / Qwen-VL) to identify fields and infer values. Ruler-enhanced strategy supported. |
| 4 | **LLM Structured Output Agent** | `src/implementations/llm-structured/` | 🔲 Planned | Serializes the accessibility / DOM tree as text, sends to a local or cloud LLM with a JSON-schema output constraint. Uses constrained decoding to guarantee valid tool calls. |
| 5 | **Hybrid (DOM + VLM Fallback)** | `src/implementations/hybrid/` | 🔲 Planned | Runs Rule-Based first; escalates to VLM only for fields that remain unfilled or have low confidence. Balances speed + coverage. |

---

## 6. Comparative Evaluation Matrix

All implementations are evaluated on the **same FormFactory benchmark** (25 forms, 8 domains, ~13,800 field-value pairs). Results are collated in `benchmark-results/`.

```
                    ┌──────────┬──────────┬──────────┬──────────┬──────────┐
                    │ Rule-    │ Embed-   │ VLM      │ LLM Str. │ Hybrid   │
Metric              │ Based    │ Matcher  │ Agent    │ Output   │ DOM+VLM  │
────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
Click Accuracy      │ —        │ —        │ —        │ —        │ —        │
Value Accuracy      │ —        │ —        │ —        │ —        │ —        │
Form Completion     │ —        │ —        │ —        │ —        │ —        │
Latency (ms/form)   │ —        │ —        │ —        │ —        │ —        │
Privacy (local?)    │ ✅ Yes   │ ✅ Yes   │ ❓ Opt-in│ ❓ Opt-in│ ❓ Mixed │
Offline Support     │ ✅ Yes   │ ✅ Yes   │ ❌ No    │ 🔶 Local │ 🔶 Partial│
────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```
> Values will be filled in as each implementation is benchmarked.

---

## 7. Folder Structure (Target)

```
c:\Code\Form-Filling-Agents\
├── Documentation\
│   ├── Flow.md                    ← this file
│   ├── Implementation.md
│   ├── MultiModal-Benchmark.md
│   ├── Report.md
│   ├── TESTING.md
│   └── DeveloperNotes.md
│
├── src\
│   ├── types\                     ← shared TypeScript interfaces
│   ├── utils\                     ← shared utilities (form-detection, form-filler, storage)
│   ├── benchmark\                 ← shared evaluation harness (FormFactory)
│   ├── content\                   ← browser content script (form detection + executor)
│   ├── background\                ← service worker (message routing)
│   ├── popup\                     ← extension popup UI
│   ├── options\                   ← extension settings page
│   │
│   └── implementations\           ← ALL agent strategies (isolated, no cross-deps)
│       ├── rule-based\            ← [IMPL-1] Baseline — keyword/DOM pattern matching
│       │   ├── agent.ts
│       │   ├── patterns.ts
│       │   └── README.md
│       ├── embedding-matcher\     ← [IMPL-2] Local embedding similarity
│       │   ├── agent.ts
│       │   ├── embedder.ts
│       │   └── README.md
│       ├── vlm-agent\             ← [IMPL-3] Vision-Language Model (screenshot-based)
│       │   ├── agent.ts
│       │   ├── screenshot.ts
│       │   ├── ruler.ts
│       │   └── README.md
│       ├── llm-structured\        ← [IMPL-4] LLM + constrained JSON output
│       │   ├── agent.ts
│       │   ├── schema-builder.ts
│       │   ├── tree-serializer.ts
│       │   └── README.md
│       └── hybrid\                ← [IMPL-5] Rule-Based + VLM fallback
│           ├── agent.ts
│           ├── confidence.ts
│           └── README.md
│
└── benchmark-results\             ← JSON/HTML reports per implementation per run
    ├── rule-based\
    ├── embedding-matcher\
    ├── vlm-agent\
    ├── llm-structured\
    └── hybrid\
```

---

## 8. Shared Interface Contract

Every implementation **must** export a class implementing the `Agent` interface:

```typescript
// src/types/index.ts  (shared)
export interface Agent {
  name: string;
  analyze(context: FormContext, userProfile?: UserProfile): Promise<Record<string, string>>;
  isApplicable(context: FormContext): boolean;
}
```

The `FormContext` is always produced by the shared `form-detection.ts` utility. The `UserProfile` comes from the **Input Pipeline**. The returned `Record<string, string>` (field-id → value) is consumed by the shared `FormFiller`.

> **Zero cross-implementation imports.** Each `src/implementations/<name>/` folder is self-contained. It may import from `src/types/` and `src/utils/`, but **never** from another `src/implementations/<other>/`.

---

## 9. Data Flow Summary (One-liner per stage)

```
[Raw User Data]
    ──▶ Input Pipeline (parser/NER/LLM)
    ──▶ UserProfile { structured JSON }
    ──▶ Content Script detects FormContext { fields[] }
    ──▶ Agent Implementation analyzes → FieldValueMapping { id: value }
    ──▶ FormFiller applies interactions to DOM
    ──▶ FillingResult captured
    ──▶ Benchmark Harness computes Click/Value/Completion metrics
    ──▶ benchmark-results/ stores per-impl JSON reports
    ──▶ Comparative analysis across all implementations
```

---

## 10. References

- FormFactory Paper: https://arxiv.org/abs/2506.01520
- FormFactory Project: https://formfactory-ai.github.io
- Benchmark Docs: `src/benchmark/README.md`
- Architecture Report: `Documentation/Report.md`
- Testing Guide: `Documentation/TESTING.md`
