# FormFactory Benchmark

Real benchmark harness aligned with the [FormFactory paper](https://arxiv.org/abs/2506.01520) (arXiv:2506.01520).

## Setup

### 1. Clone the FormFactory Dataset Repo

```bash
git clone https://github.com/formfactory-ai/formfactory.git c:\Code\formfactory
```

### 2. Start the Flask Server

In a **separate terminal**, run:

```bash
cd c:\Code\formfactory
pip install -r requirements.txt   # Flask 2.3.*
python app.py                      # → http://localhost:5000
```

Verify it works by opening http://localhost:5000 in your browser.

### 3. Install Playwright

```bash
npm install
npm run benchmark:setup   # installs the Chromium browser
```

---

## Running the Benchmark

| Command | Description |
|---------|-------------|
| `npm run benchmark:quick` | 1 instance × 25 forms — fast sanity check |
| `npm run benchmark:full` | 50 instances × 25 forms — full paper scale (1,250 total) |
| `npm run benchmark:watch` | Quick run with visible browser (headless=false) |
| `npm run benchmark:list` | List all 25 form stems |
| `npm run benchmark:form -- --form job_applications` | Single form |
| `npm run benchmark:domain -- --domain "Finance & Banking"` | One domain |

---

## Dataset Structure

The real dataset lives in `c:\Code\formfactory\data\`:

```
data/
  data1/           ← Gold-answer JSON files (one per form)
    job_applications.json       # Array of 50 objects: [{fieldLabel: value}, ...]
    grant_applications.json
    ... (25 files total)
  data2/           ← Input documents (resumes, descriptions)
    job_applications.txt        # 50 documents numbered "1. ..." "2. ..."
    grant_applications.txt
    ... (25 files total)
  labeled-images/  ← Screenshots + bounding box annotations
    A/             # Academic & Research forms
    B/             # Professional & Business
    ...
```

## Forms Coverage

| Domain | Forms |
|--------|-------|
| Academic & Research | Job Application, Grant Application, Paper Submission, Course Registration, Scholarship Application |
| Professional & Business | Startup Funding, Rental Application, Workshop Registration, Membership Application |
| Arts & Creative | Art Exhibition Submission, Literary Magazine Submission, Conference Speaker Application |
| Technology & Software | Bug Report, IT Support Request |
| Finance & Banking | Personal Loan, Bank Account Opening, Financial Planning |
| Healthcare & Medical | Patient Consent, Medical Research Enrollment, Health Insurance |
| Legal & Compliance | NDA, Background Check, Contractor Onboarding |
| Construction & Manufacturing | Project Bid, Manufacturing Order |

**Total: 25 forms, 1,250 instances (50 per form), 13,800 field-value pairs**

---

## Evaluation Metrics (Paper §5.1.2)

### Atomic (per field type)
- **Click Accuracy** — Did the agent's click land within the correct element's bounding box?
- **Value Accuracy** — Did the agent enter the correct value?
  - Exact match (normalized) for all field types except `Description`
  - BLEU-4 ≥ 30 for `Description` fields

### Episodic (per form)
- **Form Completion Rate** — % of fields correctly filled end-to-end

### Field Types Evaluated
`String` · `Dropdown` · `Checkbox` · `RadioButton` · `MultiCheckbox` · `Description` · `Date` · `NumericInput`

---

## Adding an Agent

1. Create your agent in `src/implementations/<strategy>/`
2. Implement the `BenchmarkAgent` interface:

```typescript
import type { BenchmarkAgent } from '../benchmark/runner';
import type { FormInstance, AgentAction } from '../benchmark/types';

export class MyAgent implements BenchmarkAgent {
  name = 'my-agent';

  async planActions(instance: FormInstance): Promise<AgentAction[]> {
    // instance.inputDocument — the source text (resume, description, etc.)
    // instance.goldAnswers  — field labels (NOT values — don't peek!)
    // Return: array of {type, x?, y?, text?, fieldId?} actions
    return [];
  }
}
```

3. Import and run in `scripts/run-benchmark.ts`

---

## Paper Baseline Results

Per the paper (Table 2), zero-shot MLLM performance:

| Model | Click Acc | Value Acc | Completion |
|-------|-----------|-----------|------------|
| GPT-4o | ~2.2% | ~9.8% | <2% |
| Gemini 2.5 Pro | ~3.1% | ~11.2% | <2% |
| Claude Sonnet 3.7 | ~1.8% | ~8.4% | <2% |

**No model surpasses 5% click accuracy**, underscoring the difficulty of the task.
Our rule-based agent should achieve **higher value accuracy** (keyword matching) but **similar ~0% click accuracy** (no visual grounding).
