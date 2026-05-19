# Testing & Benchmarking Guide

See the detailed design and scaling notes in [Report.md](Report.md).

This guide explains how to test your form-filling agent against the **FormFactory** benchmark from the paper: "FormFactory: An Interactive Benchmarking Suite for Multimodal Form-Filling Agents" (https://arxiv.org/abs/2506.01520).

## Quick Start

### Run Benchmark Tests

**Default (full benchmark):**
```bash
npm run test:benchmark
```

**Quick test (5-10 samples per form):**
```bash
npm run test:quick
```

**Full benchmark (all 1,250 instances):**
```bash
npm run test:full
```

**Test specific domain:**
```bash
npm run test:domain -- academic
```

## Benchmark Overview

### What's Being Tested

The FormFactory benchmark covers **25 forms** across **8 domains**:

1. **Academic & Research** (5 forms)
   - Job Applications, Grants, Paper Submissions, Course Registrations, Scholarships

2. **Professional & Business** (4 forms)
   - Startup Funding, Real Estate, Workshops, Membership Applications

3. **Arts & Creative** (3 forms)
   - Art Exhibitions, Literary Magazines, Conference Speakers

4. **Technology & Software** (2 forms)
   - Bug Reports, IT Support Requests

5. **Finance & Banking** (3 forms)
   - Personal Loans, Bank Accounts, Financial Planning

6. **Healthcare & Medical** (3 forms)
   - Surgery Consent, Medical Studies, Insurance Claims

7. **Legal & Compliance** (3 forms)
   - NDAs, Background Checks, Contractor Onboarding

8. **Construction & Manufacturing** (2 forms)
   - Project Bids, Manufacturing Orders

### Field Types Tested

- **Text**: Simple text input fields
- **Dropdown**: Select lists and combo boxes
- **Checkbox**: Multiple binary choices
- **Radio Button**: Single choice among options
- **Date**: Date picker fields
- **File Upload**: File input fields
- **Numeric Input**: Number fields
- **Description**: Free-form text areas
- **Multi-Checkbox**: Multiple checkbox selections

### Total Coverage

- **1,250 form instances** (50 per form)
- **13,800 annotated field-value pairs**
- **279 total form fields** across all forms
- Field complexity ranging from 4 to 22 fields per form

## Understanding Results

### Atomic-Level Metrics

Evaluates individual field performance:

```
String Field:
  ├─ Click Accuracy: 45.2%     (How often the agent clicks the right field)
  └─ Value Accuracy: 78.5%     (How often the field value is correct)

Dropdown Field:
  ├─ Click Accuracy: 12.1%     (Dropdowns are harder to interact with)
  └─ Value Accuracy: 95.3%     (But values are usually correct if found)
```

**What it means:**
- **Click Accuracy < 20%**: Agent struggles with visual field localization
- **Value Accuracy < 50%**: Agent misunderstands field semantics or content matching
- **Value Accuracy > 80%**: Agent has good semantic understanding

### Episodic-Level Metrics

End-to-end form completion performance:

```
Form Completion Rate: 35.2%
├─ Fields Filled: 8 out of 23
├─ Average Click Accuracy: 28.4%
└─ Average Value Accuracy: 72.1%

Overall Score: 58.3%
```

**Interpretation:**
- **Form Completion < 30%**: Agent struggles with multi-field coordination
- **Form Completion 30-70%**: Moderate performance, needs improvement
- **Form Completion > 70%**: Strong performance on this form type

### Key Insights from Paper Results

The paper evaluated state-of-the-art MLLMs in zero-shot mode:

| Model | Click Acc. | Value Acc. | Completion |
|-------|---|---|---|
| GPT-4o | 2.2% | 9.8% | 0.9% |
| Gemini 2.5 Pro | 0.9% | 70.7% | 0.4% |
| Claude 3.7 Sonnet | 0.0% | 58.0% | 0.0% |
| Qwen-VL-Max | 4.6% | 72.7% | 1.1% |

**Key findings:**
- Click accuracy is the major bottleneck (all models <5%)
- Value accuracy is relatively better (50-70%)
- End-to-end completion is extremely low (<2%)

**Why so low?**
1. **Spatial reasoning**: Hard to click the exact pixel coordinates
2. **Field-value alignment**: Matching content to the right fields
3. **Interaction complexity**: Multi-step operations (dropdowns, date pickers)
4. **Layout variability**: Different form layouts confuse models

## Analyzing Your Results

The benchmark generates two types of reports:

### 1. Test Report (Quick Summary)
```
Total Tests: 25
Passed (>50% completion): 8
Failed: 17
Success Rate: 32.00%

Average Form Completion: 45.23%
Average Click Accuracy: 18.75%
Average Value Accuracy: 62.45%
```

### 2. Analysis Report (Detailed Insights)

Shows performance by domain and field type, identifies weak/strong areas, and provides recommendations.

Example:
```
⚠️  WEAK AREAS:
  1. Domain: Technology & Software (12.5%)
  2. Field Type: Checkbox - Click Accuracy (5.2%)
  3. Multi-page forms (28.4% vs 55.2% single page)

✅ STRONG AREAS:
  1. Domain: Finance & Banking (78.3%)
  2. Field Type: String - Value Accuracy (95.1%)

💡 RECOMMENDATIONS:
  1. Enable Ruler-Enhanced Strategy to improve click accuracy
  2. Develop specialized agent for Technology & Software domain
  3. Improve multi-page form navigation logic
```

## Performance Tips

### To Improve Click Accuracy

```typescript
// Enable Ruler-Enhanced Strategy (from paper)
const config = BENCHMARK_SCENARIOS.WITH_RULER;

// This adds visual reference lines to help with spatial grounding
// Expected improvement: ~5-10% on simple forms
```

### To Improve Value Accuracy

1. **Better semantic understanding**: Parse field labels more intelligently
2. **Context awareness**: Consider form context when inferring values
3. **Type-specific handling**: Different strategies for dates vs. numbers vs. text
4. **Document parsing**: Extract values from input documents more accurately

### To Improve Overall Completion

1. **Multi-page handling**: Better navigation between form pages
2. **Field dependencies**: Detect and handle inter-field relationships
3. **Error recovery**: Retry failed fields or use alternative values
4. **Progressive filling**: Fill easier fields first to build confidence

## Running Specific Tests

### Test Academic Domain Only
```bash
npm run test:domain -- academic
```

### Test Against Complex Forms (15+ fields)
```typescript
import { createBenchmarkConfig } from './src/benchmark/benchmark-config';
import { BenchmarkTestRunner } from './src/benchmark/test-runner';

const config = createBenchmarkConfig({
  minFieldCount: 15,
});
```

### Compare Multiple Agents
```typescript
import { compareAgents } from './src/benchmark/test-suite';

const results = await compareAgents(['CommercialFormAgent', 'AdaptiveFormAgent']);
results.forEach(r => {
  console.log(`${r.agent}: ${r.averageFormCompletion}%`);
});
```

## Extending Benchmarks

### Add New Forms

1. Update `src/benchmark/formfactory-dataset.ts`
2. Add form to `FORM_FIELD_SPECS`:
   ```typescript
   'My New Form': {
     fieldCount: 10,
     sampleCount: 50,
     pairCount: 500,
     fieldTypes: ['String', 'Dropdown', 'Date'],
     multiPage: false,
   }
   ```

### Add New Field Types

1. Update `FieldType` in `formfactory-dataset.ts`
2. Add mock value generation in `test-suite.ts`
3. Handle in evaluation metrics

### Test Custom Agents

```typescript
// Your custom agent must implement the Agent interface
export class MyCustomAgent implements Agent {
  name = 'My Custom Agent';
  
  isApplicable(context: FormContext): boolean {
    // Return true if this agent can handle the form
  }
  
  async analyze(context: FormContext): Promise<Record<string, string>> {
    // Return field-value mappings
  }
}

// Register in AdaptiveFormAgent and test
```

## Files Structure

```
src/benchmark/
├── formfactory-dataset.ts      # Dataset definitions (25 forms, 13,800 pairs)
├── evaluation-metrics.ts       # Atomic & episodic evaluation logic
├── test-runner.ts              # Test execution engine
├── test-suite.ts               # Mock test case generation
├── benchmark-config.ts         # Configuration and scenarios
├── benchmark-analyzer.ts       # Results analysis and insights
└── README.md                   # Detailed benchmark documentation

scripts/
└── run-benchmark.ts            # CLI runner for benchmarks

benchmark-results/              # Generated results (gitignored)
├── results-*.json              # Raw test results
└── analysis-*.json             # Analysis reports
```

## Integration with Extension

The benchmark integrates with your form-filling agents:

1. **CommercialFormAgent**: Rule-based pattern matching
2. **DocumentUploadAgent**: File upload detection
3. **AdaptiveFormAgent**: Intelligent agent routing

Test them:
```typescript
import { BenchmarkTestRunner } from './src/benchmark/test-runner';
import { createMockTestCase } from './src/benchmark/test-suite';

const runner = new BenchmarkTestRunner();
const testCase = createMockTestCase('Scholarship Application for Students', 1);
const result = await runner.runTestCase(testCase);

console.log(`Completion: ${result.episodicMetric.formCompletionRate}%`);
```

## Troubleshooting

**Low click accuracy?**
- Enable Ruler-Enhanced Strategy
- Check visual grounding in agents
- Verify coordinate prediction logic

**Low value accuracy?**
- Improve field-label matching
- Better document parsing
- More sophisticated semantic alignment

**Timeout issues?**
- Increase `timeoutPerTest` in config
- Reduce `batchSize`
- Check for infinite loops in agents

## Reference

- Paper: https://arxiv.org/abs/2506.01520
- Project: https://formfactory-ai.github.io
- Benchmark Code: This directory
- Extension Agents: `src/agents/form-agents.ts`
