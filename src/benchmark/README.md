/**
 * FormFactory Benchmark Documentation and Usage Guide
 */

# FormFactory Benchmark Setup Guide

This directory contains the implementation of the **FormFactory** benchmark for evaluating form-filling agents. Based on the paper: "FormFactory: An Interactive Benchmarking Suite for Multimodal Form-Filling Agents" (https://arxiv.org/abs/2506.01520)

## Overview

The benchmark consists of:
- **25 forms** across **8 domains**
- **13,800 annotated field-value pairs**
- **Multiple field types**: String, Dropdown, Checkbox, Radio Button, Date, File Upload, etc.
- **Atomic & Episodic evaluation** metrics
- **Ruler-enhanced strategy** for improved spatial grounding

## Quick Start

### 1. Run Quick Benchmark
```typescript
import { runFullBenchmark } from './test-suite';
import { generateTestReport } from './test-runner';

const results = await runFullBenchmark();
const report = generateTestReport(results);
console.log(report);
```

### 2. Test Specific Domain
```typescript
import { runBenchmarkOnDomain } from './test-suite';

const results = await runBenchmarkOnDomain('Academic & Research', 5);
```

### 3. Create Custom Configuration
```typescript
import { createBenchmarkConfig, BENCHMARK_SCENARIOS } from './benchmark-config';

// Use predefined scenario
const config = BENCHMARK_SCENARIOS.WITH_RULER;

// Or create custom
const customConfig = createBenchmarkConfig({
  domains: ['Finance & Banking'],
  minFieldCount: 5,
  useRulerEnhancement: true,
});
```

## Supported Domains

1. **Academic & Research** (5 forms)
2. **Professional & Business** (4 forms)
3. **Arts & Creative** (3 forms)
4. **Technology & Software** (2 forms)
5. **Finance & Banking** (3 forms)
6. **Healthcare & Medical** (3 forms)
7. **Legal & Compliance** (3 forms)
8. **Construction & Manufacturing** (2 forms)

## Supported Field Types

- **String**: Text input fields
- **Dropdown**: Select lists
- **Checkbox**: Multiple binary choices
- **RadioButton**: Single choice among multiple options
- **Date**: Date picker fields
- **FileUpload**: File upload inputs
- **NumericInput**: Numeric values
- **Description**: Free-form text areas
- **MultiCheckbox**: Multiple checkbox selections

## Evaluation Metrics

### Atomic Level
Tests individual field type performance:
- **Click Accuracy**: How accurately the agent selects the right field (%)
- **Value Accuracy**: How correctly the agent fills the field (%)

Calculated separately for each field type.

### Episodic Level
End-to-end form completion metrics:
- **Form Completion Rate**: Percentage of fields successfully filled (%)
- **Average Click Accuracy**: Mean click accuracy across all fields (%)
- **Average Value Accuracy**: Mean value accuracy across all fields (%)
- **Overall Score**: Weighted combination of click and value accuracy (%)

## Expected Performance (from Paper)

The paper evaluates state-of-the-art MLLMs:

| Model | Click Accuracy | Value Accuracy | Form Completion |
|-------|---|---|---|
| GPT-4o | 2.2% | 9.8% | 0.9% |
| Gemini 2.5 Pro | 0.9% | 70.7% | 0.4% |
| Claude 3.7 Sonnet | 0.0% | 58.0% | 0.0% |
| Qwen-VL-Max | 4.6% | 72.7% | 1.1% |
| Grok 3 | 3.0% | 70.7% | 0.0% |

Our custom agents aim to improve upon these baselines.

## Ruler-Enhanced Strategy

From the paper (Section 4.2):

The Ruler-Enhanced Strategy overlays pixel-scale markers along form edges to help the model infer spatial relationships more accurately. Enable with:

```typescript
const config = createBenchmarkConfig({
  useRulerEnhancement: true,
  rulerScale: 1.0, // Adjustment factor for ruler precision
});
```

Performance improvement: ~5-10% click accuracy on simple forms.

## Advanced Usage

### Compare Multiple Agents
```typescript
import { compareAgents } from './test-suite';

const results = await compareAgents(['Agent1', 'Agent2', 'Agent3']);
results.forEach(result => {
  console.log(`${result.agent}: ${result.averageFormCompletion.toFixed(2)}%`);
});
```

### Filter Benchmark by Complexity
```typescript
const config = BENCHMARK_SCENARIOS.COMPLEX_FORMS; // Forms with 15+ fields

// Or custom filtering
const customConfig = createBenchmarkConfig({
  minFieldCount: 10,
  maxFieldCount: 20,
  fieldTypes: ['Dropdown', 'Date', 'Checkbox'],
});
```

### Generate HTML Report
```typescript
const config = createBenchmarkConfig({
  generateReport: true,
  reportFormat: 'html',
  outputPath: './results/benchmark.html',
});
```

## Integration with Extension

The benchmark is integrated with your form-filling agents:

1. **CommercialFormAgent**: Rule-based filling using pattern matching
2. **DocumentUploadAgent**: File upload field detection
3. **AdaptiveFormAgent**: Intelligent agent routing

Test your agents:
```typescript
import { BenchmarkTestRunner, type TestCase } from './test-runner';
import { createMockTestCase } from './test-suite';

const runner = new BenchmarkTestRunner();
const testCase = createMockTestCase('Job Application for University Positions', 1);
const result = await runner.runTestCase(testCase);

console.log(`Completion: ${result.episodicMetric.formCompletionRate.toFixed(2)}%`);
```

## Extending the Benchmark

### Add New Forms
1. Update `formfactory-dataset.ts` with form specifications
2. Add field type information to `FORM_FIELD_SPECS`
3. Assign to appropriate domain in `FORMFACTORY_DATASET`

### Add New Field Types
1. Update `FieldType` union in `formfactory-dataset.ts`
2. Add value generation logic in `test-suite.ts`
3. Update evaluation metrics if needed in `evaluation-metrics.ts`

### Add New Agents
1. Implement the `Agent` interface
2. Register in `AdaptiveFormAgent`
3. Test using `BenchmarkTestRunner`

## References

- Paper: https://arxiv.org/abs/2506.01520
- Project: https://formfactory-ai.github.io
- Benchmark Code: Provided in this directory
- Extension Agents: `/src/agents/form-agents.ts`

## Notes

- The benchmark currently uses mock data for testing. Connect to actual FormFactory platform for production evaluation.
- PyAutoGUI-based execution (from the paper) is handled by content scripts and browser automation.
- Evaluation respects the paper's methodology: Click accuracy for UI selection, Value accuracy for content (BLEU for descriptions).

## Troubleshooting

**Low Click Accuracy?**
- Enable Ruler-Enhanced Strategy
- Check field coordinate prediction
- Increase visual grounding training

**Low Value Accuracy?**
- Improve semantic understanding of field labels
- Better document parsing
- More sophisticated field-value alignment

**Timeout Issues?**
- Increase `timeoutPerTest` in config
- Reduce `batchSize`
- Check for infinite loops in agent logic
