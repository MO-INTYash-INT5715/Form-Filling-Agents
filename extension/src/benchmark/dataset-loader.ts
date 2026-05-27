/**
 * FormFactory Benchmark — Dataset Loader
 *
 * Reads the real FormFactory dataset from the cloned repo:
 *   data/data1/<form_name>.json  → array of 50 gold-answer objects
 *   data/data2/<form_name>.txt   → numbered input documents (one per instance)
 *
 * Each data1 JSON file is a flat array where index i = instance i.
 * Each data2 txt file is a single file with instances separated by a blank line
 * and prefixed with their 1-based index ("1.", "2.", ...).
 *
 * Real data confirmed by inspecting:
 *   c:\Code\formfactory\data\data1\job_applications.json
 *   c:\Code\formfactory\data\data2\job_applications.txt
 */

import * as fs from 'fs';
import * as path from 'path';
import type { FormInstance } from './types';

// ---------------------------------------------------------------------------
// Form catalogue — maps data file stems to Flask URL paths + metadata
// Derived from reading app.py routes
// ---------------------------------------------------------------------------
export const FORM_CATALOGUE: ReadonlyArray<{
  /** Stem shared by data1/<stem>.json and data2/<stem>.txt */
  dataStem: string;
  /** Human-readable form name */
  formName: string;
  /** Domain category */
  domain: string;
  /** Flask URL path (GET → render form, POST → submit form) */
  flaskPath: string;
  /** Whether this form spans multiple pages */
  multiPage: boolean;
}> = [
  // A — Academic & Research
  {
    dataStem: 'job_applications',
    formName: 'Job Application for University Positions',
    domain: 'Academic & Research',
    flaskPath: '/academic-research/job-application',
    multiPage: false,
  },
  {
    dataStem: 'grant_applications',
    formName: 'Grant or Research Funding Application',
    domain: 'Academic & Research',
    flaskPath: '/academic-research/grant-application',
    multiPage: true,
  },
  {
    dataStem: 'paper_submissions',
    formName: 'Paper Submission Form',
    domain: 'Academic & Research',
    flaskPath: '/academic-research/paper-submission',
    multiPage: false,
  },
  {
    dataStem: 'student_courses',
    formName: 'Student Course Registration Form',
    domain: 'Academic & Research',
    flaskPath: '/academic-research/course-registration',
    multiPage: true,
  },
  {
    dataStem: 'scholarship_applications',
    formName: 'Scholarship Application for Students',
    domain: 'Academic & Research',
    flaskPath: '/academic-research/scholarship-application',
    multiPage: true,
  },
  // B — Professional & Business
  {
    dataStem: 'startup_funding_applications',
    formName: 'Startup Funding Application',
    domain: 'Professional & Business',
    flaskPath: '/professional-business/startup-funding',
    multiPage: true,
  },
  {
    dataStem: 'real_estate_rental_applications',
    formName: 'Real Estate Rental Application',
    domain: 'Professional & Business',
    flaskPath: '/professional-business/rental-application',
    multiPage: true,
  },
  {
    dataStem: 'workshop_registrations',
    formName: 'Educational Workshop Registration',
    domain: 'Professional & Business',
    flaskPath: '/professional-business/workshop-registration',
    multiPage: false,
  },
  {
    dataStem: 'membership_application',
    formName: 'Association Membership Application',
    domain: 'Professional & Business',
    flaskPath: '/professional-business/membership-application',
    multiPage: true,
  },
  // C — Arts & Creative
  {
    dataStem: 'Art_Exhibition_Submission_Form',
    formName: 'Art Exhibition Submission Form',
    domain: 'Arts & Creative',
    flaskPath: '/arts-creative/exhibition-submission',
    multiPage: false,
  },
  {
    dataStem: 'Literary_Magazine_Submission',
    formName: 'Literary Magazine Submission Form',
    domain: 'Arts & Creative',
    flaskPath: '/arts-creative/literary-submission',
    multiPage: false,
  },
  {
    dataStem: 'Conference_Speaker_Application',
    formName: 'Conference Speaker Application Form',
    domain: 'Arts & Creative',
    flaskPath: '/arts-creative/speaker-application',
    multiPage: true,
  },
  // D — Technology & Software
  {
    dataStem: 'Bug_report',
    formName: 'Bug Reporting Form',
    domain: 'Technology & Software',
    flaskPath: '/tech-software/bug-report',
    multiPage: false,
  },
  {
    dataStem: 'IT_support',
    formName: 'IT Support Request Form',
    domain: 'Technology & Software',
    flaskPath: '/tech-software/support-request',
    multiPage: false,
  },
  // E — Finance & Banking
  {
    dataStem: 'person_loan_applications',
    formName: 'Personal Loan Application Form',
    domain: 'Finance & Banking',
    flaskPath: '/finance-banking/personal-loan',
    multiPage: false,
  },
  {
    dataStem: 'bank_account_applications',
    formName: 'Bank Account Opening Form',
    domain: 'Finance & Banking',
    flaskPath: '/finance-banking/account-opening',
    multiPage: false,
  },
  {
    dataStem: 'financial_planning',
    formName: 'Financial Planning Consultation Form',
    domain: 'Finance & Banking',
    flaskPath: '/finance-banking/financial-planning',
    multiPage: false,
  },
  // F — Healthcare & Medical
  {
    dataStem: 'Patient_Consent',
    formName: 'Patient Consent for Surgery',
    domain: 'Healthcare & Medical',
    flaskPath: '/healthcare-medical/patient-consent',
    multiPage: false,
  },
  {
    dataStem: 'Medical_study_Form',
    formName: 'Medical Research Study Enrollment',
    domain: 'Healthcare & Medical',
    flaskPath: '/healthcare-medical/research-enrollment',
    multiPage: false,
  },
  {
    dataStem: 'Health_Insurance',
    formName: 'Health Insurance Claim Form',
    domain: 'Healthcare & Medical',
    flaskPath: '/healthcare-medical/insurance-claim',
    multiPage: true,
  },
  // G — Legal & Compliance
  {
    dataStem: 'NDA',
    formName: 'NDA Submission Form',
    domain: 'Legal & Compliance',
    flaskPath: '/legal-compliance/nda-submission',
    multiPage: false,
  },
  {
    dataStem: 'Background_check',
    formName: 'Background Check Authorization Form',
    domain: 'Legal & Compliance',
    flaskPath: '/legal-compliance/background-check',
    multiPage: false,
  },
  {
    dataStem: 'Contrator_onboard',
    formName: 'Contractor Onboarding Form',
    domain: 'Legal & Compliance',
    flaskPath: '/legal-compliance/contractor-onboarding',
    multiPage: true,
  },
  // H — Construction & Manufacturing
  {
    dataStem: 'Project_Bid',
    formName: 'Project Bid Submission Form',
    domain: 'Construction & Manufacturing',
    flaskPath: '/construction-manufacturing/project-bid',
    multiPage: false,
  },
  {
    dataStem: 'Manufacturing_Order',
    formName: 'Manufacturing Order Form',
    domain: 'Construction & Manufacturing',
    flaskPath: '/construction-manufacturing/order-request',
    multiPage: true,
  },
] as const;

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

/**
 * Parse a data2 .txt file into an array of instance documents.
 *
 * Format: instances are separated by a blank line and prefixed with
 * their 1-based index followed by a period and space: "1. content..."
 *
 * We split on the numbered prefix pattern: /^\d+\.\s/m
 */
function parseData2File(content: string): string[] {
  const normalized = content.replace(/\r\n/g, '\n');
  const instances: string[] = [];
  let currentIdx = 1;
  let searchPos = 0;
  
  while (currentIdx <= 50) {
    const nextIdx = currentIdx + 1;
    const regex = new RegExp(`\\n(?=${nextIdx}[\\.\\)]\\s?)`, 'g');
    regex.lastIndex = searchPos;
    
    const match = regex.exec(normalized);
    if (!match) {
      const lastPart = normalized.substring(searchPos);
      const stripped = lastPart.replace(/^\d+[\.\)]\s*/, '').trim();
      if (stripped) instances.push(stripped);
      break;
    }
    
    const cutPos = match.index;
    const part = normalized.substring(searchPos, cutPos);
    const stripped = part.replace(/^\d+[\.\)]\s*/, '').trim();
    if (stripped) instances.push(stripped);
    
    searchPos = cutPos + 1;
    currentIdx++;
  }
  
  return instances;
}

/**
 * Load all FormInstance objects for a given form, up to maxInstances.
 */
function loadFormInstances(
  dataBasePath: string,
  dataStem: string,
  formName: string,
  domain: string,
  flaskPath: string,
  multiPage: boolean,
  maxInstances: number
): FormInstance[] {
  const data1Path = path.join(dataBasePath, 'data1', `${dataStem}.json`);
  const data2Path = path.join(dataBasePath, 'data2', `${dataStem}.txt`);

  if (!fs.existsSync(data1Path)) {
    console.warn(`[dataset-loader] Missing data1 file: ${data1Path}`);
    return [];
  }
  if (!fs.existsSync(data2Path)) {
    console.warn(`[dataset-loader] Missing data2 file: ${data2Path}`);
    return [];
  }

  let goldArray: Record<string, string | string[]>[];
  try {
    const raw = fs.readFileSync(data1Path, 'utf-8');
    const parsed = JSON.parse(raw);
    goldArray = Array.isArray(parsed) ? parsed : [parsed];
  } catch (e) {
    console.error(`[dataset-loader] Failed to parse ${data1Path}:`, e);
    return [];
  }

  let inputDocs: string[];
  try {
    const raw = fs.readFileSync(data2Path, 'utf-8');
    inputDocs = parseData2File(raw);
  } catch (e) {
    console.error(`[dataset-loader] Failed to read ${data2Path}:`, e);
    inputDocs = [];
  }

  const count = Math.min(maxInstances, goldArray.length, Math.max(inputDocs.length, 1));
  const instances: FormInstance[] = [];

  for (let i = 0; i < count; i++) {
    instances.push({
      formId: dataStem,
      formName,
      domain,
      instanceIndex: i,
      inputDocument: inputDocs[i] ?? `Instance ${i + 1} — no input document available`,
      goldAnswers: goldArray[i] ?? {},
      multiPage,
      formPath: flaskPath,
    });
  }

  return instances;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface LoadOptions {
  /**
   * Absolute path to the cloned formfactory-ai/formfactory repo.
   * Expects subdirectories: data/data1/ and data/data2/
   */
  formFactoryPath: string;
  /**
   * Filter to specific form data stems (e.g. ['job_applications', 'NDA']).
   * Leave undefined to load all 25 forms.
   */
  formStems?: string[];
  /** Maximum number of instances to load per form. Default: 1 */
  maxInstancesPerForm?: number;
}

/**
 * Load FormInstance records from the real FormFactory dataset.
 *
 * @returns Array of FormInstance objects ready for agent evaluation.
 */
export function loadDataset(options: LoadOptions): FormInstance[] {
  const {
    formFactoryPath,
    formStems,
    maxInstancesPerForm = 1,
  } = options;

  const dataBasePath = path.join(formFactoryPath, 'data');

  if (!fs.existsSync(dataBasePath)) {
    throw new Error(
      `FormFactory data directory not found at: ${dataBasePath}\n` +
      `Please clone the repo: git clone https://github.com/formfactory-ai/formfactory.git c:\\Code\\formfactory`
    );
  }

  const catalogue = formStems
    ? FORM_CATALOGUE.filter(f => formStems.includes(f.dataStem))
    : FORM_CATALOGUE;

  const allInstances: FormInstance[] = [];

  for (const entry of catalogue) {
    const instances = loadFormInstances(
      dataBasePath,
      entry.dataStem,
      entry.formName,
      entry.domain,
      entry.flaskPath,
      entry.multiPage,
      maxInstancesPerForm
    );
    allInstances.push(...instances);
    console.log(`[dataset-loader] Loaded ${instances.length} instance(s) for "${entry.formName}"`);
  }

  return allInstances;
}

/**
 * Return the list of all 25 form stems available in the dataset.
 */
export function availableFormStems(): string[] {
  return FORM_CATALOGUE.map(f => f.dataStem);
}

/**
 * Return the list of all 8 domains.
 */
export function availableDomains(): string[] {
  return [...new Set(FORM_CATALOGUE.map(f => f.domain))];
}
