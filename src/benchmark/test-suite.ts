/**
 * FormFactory Benchmark Test Suite
 * Unit and integration tests for form-filling agents
 */

import { BenchmarkTestRunner, type TestCase } from './test-runner';
import type { FormInstance } from './formfactory-dataset';
import { FORM_FIELD_SPECS, FORMFACTORY_DATASET } from './formfactory-dataset';

/**
 * Create a mock test case from FormFactory specifications
 */
export function createMockTestCase(
  formName: string,
  instanceNumber: number
): TestCase {
  const spec = FORM_FIELD_SPECS[formName];
  if (!spec) {
    throw new Error(`Form "${formName}" not found in specifications`);
  }

  // Find domain
  let domain = '';
  for (const [_key, value] of Object.entries(FORMFACTORY_DATASET)) {
    if (value.forms.includes(formName)) {
      domain = value.domain;
      break;
    }
  }

  // Create mock form instance
  const formInstance: FormInstance = {
    formId: `${formName.replace(/\s+/g, '-').toLowerCase()}-${instanceNumber}`,
    formName,
    domain,
    instanceNumber,
    fieldCount: spec.fieldCount,
    multiPage: spec.multiPage,
    pageCount: spec.multiPage ? 2 : 1,
    fields: spec.fieldTypes.map((type, index) => ({
      fieldId: `field-${index}`,
      fieldName: `field_${index}`,
      fieldType: type,
      label: `Field ${index + 1} (${type})`,
      required: index < spec.fieldCount / 2,
      expectedValue: generateMockValue(type),
    })),
    inputDocument: {
      type: 'description',
      content: generateMockDocument(formName),
    },
    groundTruth: spec.fieldTypes.reduce(
      (acc, type, index) => {
        acc[`field_${index}`] = generateMockValue(type);
        return acc;
      },
      {} as Record<string, string | string[]>
    ),
  };

  return {
    formInstance,
    inputContext: formInstance.inputDocument?.content || '',
    expectedActions: generateMockActions(formInstance),
  };
}

/**
 * Generate mock form data based on field type
 */
function generateMockValue(fieldType: string): string | string[] {
  const mockData: Record<string, string | string[]> = {
    String: 'John Doe',
    Dropdown: 'Option 1',
    Checkbox: 'on',
    RadioButton: 'choice_1',
    Description: 'This is a sample description for the form field.',
    Date: '2025-05-15',
    FileUpload: 'sample.pdf',
    NumericInput: '12345',
    MultiCheckbox: ['option_1', 'option_2'],
  };
  return mockData[fieldType] || '';
}

/**
 * Generate mock document content
 */
function generateMockDocument(formName: string): string {
  const mockDocuments: Record<string, string> = {
    'Job Application for University Positions': `
Name: John Doe
Email: john.doe@example.com
Phone: (555) 123-4567
Education: Ph.D. in Computer Science
Experience: 10 years in software engineering
    `,
    'Startup Funding Application': `
Company: TechStartup Inc.
Founded: 2023-01-15
Industry: Artificial Intelligence
Funding Sought: $500,000
Pitch: We are building an AI-powered form filling platform.
    `,
    'Scholarship Application for Students': `
Name: Jane Smith
GPA: 3.8
Major: Computer Science
Financial Need: High
Community Service: 200 hours
    `,
    'Personal Loan Application Form': `
Name: Robert Johnson
Annual Income: $75,000
Employment: Full-time
Loan Amount: $25,000
Purpose: Home Improvement
    `,
  };
  return mockDocuments[formName] || 'Sample form input document';
}

/**
 * Generate mock expected actions
 */
function generateMockActions(
  formInstance: FormInstance
): Array<{ type: 'click' | 'type'; coordinate?: { x: number; y: number }; text?: string }> {
  const actions: Array<{ type: 'click' | 'type'; coordinate?: { x: number; y: number }; text?: string }> = [];

  for (const field of formInstance.fields) {
    // Click on field
    actions.push({
      type: 'click',
      coordinate: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
    });

    // Type value
    const value = formInstance.groundTruth[field.fieldName];
    if (typeof value === 'string') {
      actions.push({
        type: 'type',
        text: value,
      });
    }
  }

  return actions;
}

/**
 * Run benchmark on a specific domain
 */
export async function runBenchmarkOnDomain(domain: string, sampleSize: number = 5) {
  const runner = new BenchmarkTestRunner();

  // Find forms in domain
  let formsInDomain: string[] = [];
  for (const [_key, value] of Object.entries(FORMFACTORY_DATASET)) {
    if (value.domain === domain) {
      formsInDomain = value.forms;
      break;
    }
  }

  if (formsInDomain.length === 0) {
    throw new Error(`Domain "${domain}" not found`);
  }

  // Create test cases
  const testCases: TestCase[] = [];
  for (const formName of formsInDomain) {
    for (let i = 1; i <= Math.min(sampleSize, 5); i++) {
      testCases.push(createMockTestCase(formName, i));
    }
  }

  // Run benchmark
  return runner.runBenchmark(testCases);
}

/**
 * Run all benchmarks
 */
export async function runFullBenchmark() {
  const runner = new BenchmarkTestRunner();
  const allTestCases: TestCase[] = [];

  // Create test cases from all forms
  for (const [_key, spec] of Object.entries(FORMFACTORY_DATASET)) {
    for (const formName of spec.forms) {
      // Use 1 sample per form for quick testing (paper uses 50)
      allTestCases.push(createMockTestCase(formName, 1));
    }
  }

  return runner.runBenchmark(allTestCases);
}

/**
 * Benchmark specific models/agents
 */
export async function compareAgents(agents: string[]) {
  const results = [];

  for (const agent of agents) {
    console.log(`Testing agent: ${agent}`);
    // In real scenario, this would switch between different agent implementations
    const benchmarkResult = await runFullBenchmark();
    results.push({
      agent,
      ...benchmarkResult.summary,
    });
  }

  return results;
}
