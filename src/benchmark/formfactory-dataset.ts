/**
 * FormFactory Dataset Configuration
 * Based on: https://arxiv.org/abs/2506.01520
 * 
 * 25 forms across 8 domains with 13,800 annotated field-value pairs
 */

export type FieldType = 
  | 'String'
  | 'Dropdown'
  | 'Checkbox'
  | 'RadioButton'
  | 'Description'
  | 'Date'
  | 'FileUpload'
  | 'NumericInput'
  | 'MultiCheckbox';

export interface FormFieldAnnotation {
  fieldId: string;
  fieldName: string;
  fieldType: FieldType;
  label?: string;
  required: boolean;
  expectedValue?: string | string[];
}

export interface FormInstance {
  formId: string;
  formName: string;
  domain: string;
  instanceNumber: number;
  fieldCount: number;
  fields: FormFieldAnnotation[];
  inputDocument?: {
    type: 'resume' | 'description' | 'paper' | 'document';
    content: string;
  };
  groundTruth: Record<string, string | string[]>;
  multiPage: boolean;
  pageCount?: number;
}

export interface FormBenchmark {
  totalForms: number;
  totalInstances: number;
  totalPairs: number;
  domains: string[];
  forms: FormInstance[];
}

// FormFactory dataset based on Table 1 from the paper
export const FORMFACTORY_DATASET: Record<string, {
  forms: string[];
  domain: string;
  description: string;
}> = {
  ACADEMIC_RESEARCH: {
    domain: 'Academic & Research',
    description: 'University and research-related forms',
    forms: [
      'Job Application for University Positions',
      'Grant or Research Funding Application',
      'Paper Submission Form',
      'Student Course Registration Form',
      'Scholarship Application for Students',
    ],
  },
  PROFESSIONAL_BUSINESS: {
    domain: 'Professional & Business',
    description: 'Business and professional applications',
    forms: [
      'Startup Funding Application',
      'Real Estate Rental Application',
      'Educational Workshop Registration',
      'Association Membership Application',
    ],
  },
  ARTS_CREATIVE: {
    domain: 'Arts & Creative',
    description: 'Creative and artistic submissions',
    forms: [
      'Art Exhibition Submission Form',
      'Literary Magazine Submission Form',
      'Conference Speaker Application Form',
    ],
  },
  TECHNOLOGY_SOFTWARE: {
    domain: 'Technology & Software',
    description: 'Technology and software-related forms',
    forms: [
      'Bug Reporting Form',
      'IT Support Request Form',
    ],
  },
  FINANCE_BANKING: {
    domain: 'Finance & Banking',
    description: 'Financial and banking applications',
    forms: [
      'Personal Loan Application Form',
      'Bank Account Opening Form',
      'Financial Planning Consultation Form',
    ],
  },
  HEALTHCARE_MEDICAL: {
    domain: 'Healthcare & Medical',
    description: 'Healthcare and medical forms',
    forms: [
      'Patient Consent for Surgery',
      'Medical Research Study Enrollment',
      'Health Insurance Claim Form',
    ],
  },
  LEGAL_COMPLIANCE: {
    domain: 'Legal & Compliance',
    description: 'Legal and compliance-related forms',
    forms: [
      'NDA Submission Form',
      'Background Check Authorization Form',
      'Contractor Onboarding Form',
    ],
  },
  CONSTRUCTION_MANUFACTURING: {
    domain: 'Construction & Manufacturing',
    description: 'Construction and manufacturing forms',
    forms: [
      'Project Bid Submission Form',
      'Manufacturing Order Form',
    ],
  },
};

// Field type distribution for each form
export const FORM_FIELD_SPECS: Record<string, {
  fieldCount: number;
  sampleCount: number;
  pairCount: number;
  fieldTypes: FieldType[];
  multiPage: boolean;
}> = {
  'Job Application for University Positions': {
    fieldCount: 4,
    sampleCount: 50,
    pairCount: 200,
    fieldTypes: ['String', 'Date'],
    multiPage: false,
  },
  'Grant or Research Funding Application': {
    fieldCount: 6,
    sampleCount: 50,
    pairCount: 300,
    fieldTypes: ['String', 'Date', 'Dropdown', 'FileUpload', 'Description'],
    multiPage: true,
  },
  'Paper Submission Form': {
    fieldCount: 7,
    sampleCount: 50,
    pairCount: 300,
    fieldTypes: ['String', 'Description', 'FileUpload'],
    multiPage: false,
  },
  'Student Course Registration Form': {
    fieldCount: 8,
    sampleCount: 50,
    pairCount: 400,
    fieldTypes: ['String', 'Dropdown', 'Checkbox', 'Date'],
    multiPage: true,
  },
  'Scholarship Application for Students': {
    fieldCount: 16,
    sampleCount: 50,
    pairCount: 800,
    fieldTypes: ['String', 'Date', 'Dropdown', 'RadioButton', 'FileUpload'],
    multiPage: true,
  },
  'Startup Funding Application': {
    fieldCount: 18,
    sampleCount: 50,
    pairCount: 900,
    fieldTypes: ['String', 'Date', 'Dropdown', 'NumericInput', 'Description', 'FileUpload'],
    multiPage: true,
  },
  'Real Estate Rental Application': {
    fieldCount: 22,
    sampleCount: 50,
    pairCount: 1100,
    fieldTypes: ['String', 'Date', 'Dropdown', 'NumericInput', 'FileUpload', 'RadioButton'],
    multiPage: true,
  },
  'Educational Workshop Registration': {
    fieldCount: 17,
    sampleCount: 50,
    pairCount: 850,
    fieldTypes: ['String', 'Date', 'Dropdown', 'Checkbox', 'RadioButton'],
    multiPage: false,
  },
  'Association Membership Application': {
    fieldCount: 20,
    sampleCount: 50,
    pairCount: 1000,
    fieldTypes: ['String', 'Date', 'Dropdown', 'NumericInput', 'FileUpload', 'RadioButton'],
    multiPage: true,
  },
  'Art Exhibition Submission Form': {
    fieldCount: 11,
    sampleCount: 50,
    pairCount: 550,
    fieldTypes: ['String', 'Description', 'Date', 'FileUpload', 'Dropdown', 'RadioButton'],
    multiPage: false,
  },
  'Literary Magazine Submission Form': {
    fieldCount: 11,
    sampleCount: 50,
    pairCount: 550,
    fieldTypes: ['String', 'Description', 'Date', 'FileUpload', 'RadioButton'],
    multiPage: false,
  },
  'Conference Speaker Application Form': {
    fieldCount: 14,
    sampleCount: 50,
    pairCount: 700,
    fieldTypes: ['String', 'Date', 'Description', 'FileUpload', 'Dropdown', 'RadioButton'],
    multiPage: true,
  },
  'Bug Reporting Form': {
    fieldCount: 10,
    sampleCount: 50,
    pairCount: 500,
    fieldTypes: ['String', 'Dropdown', 'Description', 'FileUpload'],
    multiPage: false,
  },
  'IT Support Request Form': {
    fieldCount: 11,
    sampleCount: 50,
    pairCount: 550,
    fieldTypes: ['String', 'Dropdown', 'Description', 'FileUpload', 'RadioButton'],
    multiPage: false,
  },
  'Personal Loan Application Form': {
    fieldCount: 7,
    sampleCount: 50,
    pairCount: 350,
    fieldTypes: ['String', 'NumericInput', 'Date'],
    multiPage: false,
  },
  'Bank Account Opening Form': {
    fieldCount: 5,
    sampleCount: 50,
    pairCount: 250,
    fieldTypes: ['String', 'Date'],
    multiPage: false,
  },
  'Financial Planning Consultation Form': {
    fieldCount: 6,
    sampleCount: 50,
    pairCount: 300,
    fieldTypes: ['String', 'NumericInput', 'Date', 'RadioButton'],
    multiPage: false,
  },
  'Patient Consent for Surgery': {
    fieldCount: 8,
    sampleCount: 50,
    pairCount: 400,
    fieldTypes: ['String', 'Date', 'Checkbox'],
    multiPage: false,
  },
  'Medical Research Study Enrollment': {
    fieldCount: 8,
    sampleCount: 50,
    pairCount: 400,
    fieldTypes: ['String', 'Date', 'Checkbox', 'RadioButton'],
    multiPage: false,
  },
  'Health Insurance Claim Form': {
    fieldCount: 10,
    sampleCount: 50,
    pairCount: 400,
    fieldTypes: ['String', 'Date', 'NumericInput', 'Dropdown', 'FileUpload'],
    multiPage: true,
  },
  'NDA Submission Form': {
    fieldCount: 9,
    sampleCount: 50,
    pairCount: 450,
    fieldTypes: ['String', 'Date', 'Description', 'FileUpload', 'Checkbox', 'RadioButton'],
    multiPage: false,
  },
  'Background Check Authorization Form': {
    fieldCount: 11,
    sampleCount: 50,
    pairCount: 550,
    fieldTypes: ['String', 'Date', 'Checkbox', 'RadioButton'],
    multiPage: false,
  },
  'Contractor Onboarding Form': {
    fieldCount: 14,
    sampleCount: 50,
    pairCount: 700,
    fieldTypes: ['String', 'Date', 'FileUpload', 'Dropdown', 'RadioButton', 'Description'],
    multiPage: true,
  },
  'Project Bid Submission Form': {
    fieldCount: 13,
    sampleCount: 50,
    pairCount: 650,
    fieldTypes: ['String', 'NumericInput', 'Date', 'Description', 'FileUpload'],
    multiPage: false,
  },
  'Manufacturing Order Form': {
    fieldCount: 13,
    sampleCount: 50,
    pairCount: 650,
    fieldTypes: ['String', 'NumericInput', 'Date', 'Dropdown', 'FileUpload'],
    multiPage: true,
  },
};

export const BENCHMARK_STATS = {
  totalForms: 25,
  totalInstances: 1250,
  totalPairs: 13800,
  fieldTypes: 9,
};
