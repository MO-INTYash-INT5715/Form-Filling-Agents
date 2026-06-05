#!/usr/bin/env tsx
/**
 * Web-Portal Benchmark Runner
 *
 * Runs all 3 portal agents (rule-based, embedding-matcher, llm-structured)
 * against all 25 FormFactory forms via the live Flask server.
 *
 * Usage:
 *   cd /d/Code/FFA/web-portal
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx benchmark.ts
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx benchmark.ts --agent rule-based
 *   NODE_TLS_REJECT_UNAUTHORIZED=0 npx tsx benchmark.ts --instances 3
 *
 * Prerequisites:
 *   Flask server running: cd /d/Code/formfactory && python app.py
 */

import * as fs   from 'fs';
import * as path from 'path';
import { scrapeForm }           from './src/scraper/form-scraper';
import { RuleBasedAgent }       from './src/agents/rule-based';
import { EmbeddingMatcherAgent } from './src/agents/embedding-matcher';
import { LLMStructuredAgent }   from './src/agents/llm-structured';
import { flattenProfile }       from './src/agents/types';
import type { ScrapedForm }     from './src/types/index';
import type { FlatProfile, FieldFill } from './src/agents/types';

// ── Form catalogue (mirrors extension/src/benchmark/dataset-loader.ts) ──────

const FORM_CATALOGUE: Array<{ stem: string; name: string; domain: string; path: string }> = [
  { stem: 'job_applications',           name: 'Job Application',            domain: 'Academic & Research',          path: '/academic-research/job-application' },
  { stem: 'grant_applications',         name: 'Grant Application',          domain: 'Academic & Research',          path: '/academic-research/grant-application' },
  { stem: 'paper_submissions',          name: 'Paper Submission',           domain: 'Academic & Research',          path: '/academic-research/paper-submission' },
  { stem: 'student_courses',            name: 'Course Registration',        domain: 'Academic & Research',          path: '/academic-research/course-registration' },
  { stem: 'scholarship_applications',   name: 'Scholarship Application',    domain: 'Academic & Research',          path: '/academic-research/scholarship-application' },
  { stem: 'startup_funding_applications', name: 'Startup Funding',          domain: 'Professional & Business',      path: '/professional-business/startup-funding' },
  { stem: 'real_estate_rental_applications', name: 'Rental Application',   domain: 'Professional & Business',      path: '/professional-business/rental-application' },
  { stem: 'workshop_registrations',     name: 'Workshop Registration',      domain: 'Professional & Business',      path: '/professional-business/workshop-registration' },
  { stem: 'membership_application',     name: 'Membership Application',     domain: 'Professional & Business',      path: '/professional-business/membership-application' },
  { stem: 'Art_Exhibition_Submission_Form', name: 'Art Exhibition',         domain: 'Creative & Arts',              path: '/creative-arts/art-exhibition' },
  { stem: 'Literary_Magazine_Submission',   name: 'Literary Submission',    domain: 'Creative & Arts',              path: '/creative-arts/literary-magazine' },
  { stem: 'Conference_Speaker_Application', name: 'Conference Speaker',     domain: 'Creative & Arts',              path: '/creative-arts/conference-speaker' },
  { stem: 'Bug_report',                 name: 'Bug Report',                 domain: 'IT & Technology',              path: '/it-technology/bug-report' },
  { stem: 'IT_support',                 name: 'IT Support',                 domain: 'IT & Technology',              path: '/it-technology/it-support' },
  { stem: 'person_loan_applications',   name: 'Personal Loan',              domain: 'Finance & Banking',            path: '/finance-banking/personal-loan' },
  { stem: 'bank_account_applications',  name: 'Bank Account',               domain: 'Finance & Banking',            path: '/finance-banking/bank-account' },
  { stem: 'financial_planning',         name: 'Financial Planning',         domain: 'Finance & Banking',            path: '/finance-banking/financial-planning' },
  { stem: 'Patient_Consent',            name: 'Patient Consent',            domain: 'Healthcare',                   path: '/healthcare/patient-consent' },
  { stem: 'Medical_study_Form',         name: 'Medical Study',              domain: 'Healthcare',                   path: '/healthcare/medical-study' },
  { stem: 'Health_Insurance',           name: 'Health Insurance',           domain: 'Healthcare',                   path: '/healthcare/health-insurance' },
  { stem: 'NDA',                        name: 'NDA',                        domain: 'Legal & Compliance',           path: '/legal-compliance/nda' },
  { stem: 'Background_check',           name: 'Background Check',           domain: 'Legal & Compliance',           path: '/legal-compliance/background-check' },
  { stem: 'Contrator_onboard',          name: 'Contractor Onboarding',      domain: 'Legal & Compliance',           path: '/legal-compliance/contractor-onboard' },
  { stem: 'Project_Bid',                name: 'Project Bid',                domain: 'Construction & Manufacturing', path: '/construction-manufacturing/project-bid' },
  { stem: 'Manufacturing_Order',        name: 'Manufacturing Order',        domain: 'Construction & Manufacturing', path: '/construction-manufacturing/manufacturing-order' },
];

// ── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => { const i = args.indexOf(flag); return i > -1 ? args[i + 1] : undefined; };
  return {
    agent:     get('--agent'),                  // undefined = all 3
    serverUrl: get('--server') ?? 'http://localhost:5000',
    instances: parseInt(get('--instances') ?? '1', 10),
    headless:  !args.includes('--watch'),
  };
}

// ── Scoring ───────────────────────────────────────────────────────────────────

function scoreFills(fills: FieldFill[], goldAnswers: Record<string, string>): {
  fillRate: number;
  valueAccuracy: number;
  matched: number;
  attempted: number;
  total: number;
} {
  const total = fills.length;
  const attempted = fills.filter(f => f.value !== undefined).length;
  const fillRate = total > 0 ? (attempted / total) * 100 : 0;

  // Value accuracy: for filled fields that have a gold answer, check if
  // filled value loosely matches (case-insensitive substring)
  let correct = 0;
  let scoreable = 0;
  for (const fill of fills) {
    if (fill.value === undefined) continue;
    const gold = goldAnswers[fill.fieldId] ?? goldAnswers[fill.label ?? ''];
    if (!gold) continue;
    scoreable++;
    const pred = fill.value.toLowerCase().trim();
    const ref  = String(gold).toLowerCase().trim();
    if (pred === ref || pred.includes(ref) || ref.includes(pred)) correct++;
  }

  const valueAccuracy = scoreable > 0 ? (correct / scoreable) * 100 : 0;

  return { fillRate, valueAccuracy, matched: correct, attempted, total };
}

// ── Load gold answers for a form + instance ───────────────────────────────────

function loadGoldAnswers(stem: string, instanceIdx: number, dataPath: string): Record<string, string> {
  const p = path.join(dataPath, 'data1', `${stem}.json`);
  if (!fs.existsSync(p)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf-8')) as Array<Record<string, unknown>>;
    const inst = data[instanceIdx] ?? data[0] ?? {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(inst)) {
      if (v !== null && v !== undefined) {
        out[k] = Array.isArray(v) ? (v as unknown[]).join(', ') : String(v);
      }
    }
    return out;
  } catch { return {}; }
}

// ── Per-form result type ──────────────────────────────────────────────────────

interface FormBenchResult {
  form:         string;
  domain:       string;
  url:          string;
  fieldCount:   number;
  fillRate:     number;
  valueAccuracy: number;
  matched:      number;
  attempted:    number;
  durationMs:   number;
  error?:       string;
}

// ── Run one agent across all forms ────────────────────────────────────────────

async function runAgent(
  agentName: 'rule-based' | 'embedding-matcher' | 'llm-structured',
  profile:   FlatProfile,
  serverUrl: string,
  dataPath:  string,
  instances: number,
  headless:  boolean
): Promise<{ results: FormBenchResult[]; totalMs: number }> {
  const agent =
    agentName === 'embedding-matcher' ? new EmbeddingMatcherAgent() :
    agentName === 'llm-structured'    ? new LLMStructuredAgent()    :
                                        new RuleBasedAgent();

  const results: FormBenchResult[] = [];
  const start = Date.now();

  for (const entry of FORM_CATALOGUE) {
    const url = `${serverUrl}${entry.path}`;
    const formStart = Date.now();
    let form: ScrapedForm;

    try {
      form = await scrapeForm(url);
    } catch (err) {
      results.push({
        form: entry.name, domain: entry.domain, url,
        fieldCount: 0, fillRate: 0, valueAccuracy: 0, matched: 0, attempted: 0,
        durationMs: Date.now() - formStart,
        error: `Scrape failed: ${(err as Error).message}`,
      });
      process.stdout.write(`  ✗ ${entry.name}: scrape failed\n`);
      continue;
    }

    // Accumulate across requested instances (all use same profile, just averaging)
    let totalFillRate = 0, totalVA = 0, totalMatched = 0, totalAttempted = 0;
    let runCount = 0;

    for (let inst = 0; inst < instances; inst++) {
      const gold = loadGoldAnswers(entry.stem, inst, dataPath);
      try {
        const { fills } = await agent.fill(form, profile);
        // Map gold answers by field ID as well as label
        const goldById: Record<string, string> = {};
        for (const field of form.fields) {
          const byLabel = gold[field.label ?? ''] ?? gold[field.name ?? ''];
          if (byLabel) goldById[field.id] = byLabel;
        }
        const score = scoreFills(fills, goldById);
        totalFillRate  += score.fillRate;
        totalVA        += score.valueAccuracy;
        totalMatched   += score.matched;
        totalAttempted += score.attempted;
        runCount++;
      } catch (err) {
        results.push({
          form: entry.name, domain: entry.domain, url,
          fieldCount: form.fields.length, fillRate: 0, valueAccuracy: 0, matched: 0, attempted: 0,
          durationMs: Date.now() - formStart,
          error: `Fill failed: ${(err as Error).message}`,
        });
        process.stdout.write(`  ✗ ${entry.name}: fill failed\n`);
        runCount = 0;
        break;
      }
    }

    if (runCount > 0) {
      const r: FormBenchResult = {
        form: entry.name, domain: entry.domain, url,
        fieldCount:    form.fields.length,
        fillRate:      totalFillRate  / runCount,
        valueAccuracy: totalVA        / runCount,
        matched:       Math.round(totalMatched   / runCount),
        attempted:     Math.round(totalAttempted / runCount),
        durationMs:    Date.now() - formStart,
      };
      results.push(r);
      process.stdout.write(
        `  ✓ ${entry.name.padEnd(35)} fields:${form.fields.length.toString().padStart(3)}  fill:${r.fillRate.toFixed(0).padStart(3)}%  va:${r.valueAccuracy.toFixed(0).padStart(3)}%\n`
      );
    }
  }

  return { results, totalMs: Date.now() - start };
}

// ── Report ────────────────────────────────────────────────────────────────────

function printReport(
  agentName: string,
  results:   FormBenchResult[],
  totalMs:   number
) {
  const ok = results.filter(r => !r.error);
  const avgFillRate  = ok.reduce((s, r) => s + r.fillRate,  0) / (ok.length || 1);
  const avgVA        = ok.reduce((s, r) => s + r.valueAccuracy, 0) / (ok.length || 1);
  const totalFields  = ok.reduce((s, r) => s + r.fieldCount, 0);
  const totalFilled  = ok.reduce((s, r) => s + r.attempted,  0);

  const lines: string[] = [];
  const p = (s = '') => lines.push(s);

  p('╔══════════════════════════════════════════════════════════════╗');
  p(`║  Web-Portal Benchmark — ${agentName.padEnd(36)}║`);
  p('╚══════════════════════════════════════════════════════════════╝');
  p();
  p(`  Forms:           ${results.length} / ${FORM_CATALOGUE.length}`);
  p(`  Total fields:    ${totalFields}`);
  p(`  Total filled:    ${totalFilled}`);
  p(`  Avg fill rate:   ${avgFillRate.toFixed(1)}%`);
  p(`  Avg value acc.:  ${avgVA.toFixed(1)}%`);
  p(`  Runtime:         ${(totalMs / 1000).toFixed(1)}s`);
  p();
  p('━━━ PER DOMAIN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const domains = [...new Set(results.map(r => r.domain))];
  for (const domain of domains) {
    const dr = ok.filter(r => r.domain === domain);
    const fr = dr.reduce((s, r) => s + r.fillRate, 0) / (dr.length || 1);
    const va = dr.reduce((s, r) => s + r.valueAccuracy, 0) / (dr.length || 1);
    p(`  ${domain.padEnd(34)} fill:${fr.toFixed(0).padStart(3)}%  va:${va.toFixed(0).padStart(3)}%`);
  }

  if (results.some(r => r.error)) {
    p();
    p('━━━ ERRORS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    results.filter(r => r.error).forEach(r => p(`  ${r.form}: ${r.error}`));
  }

  p();
  p('══════════════════════════════════════════════════════════════');

  const text = lines.join('\n');
  console.log('\n' + text);
  return { text, avgFillRate, avgVA };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { agent, serverUrl, instances, headless } = parseArgs();
  const dataPath = 'D:/Code/formfactory';
  const profilePath = path.join(__dirname, 'data', 'test-profile.json');
  const outputDir   = path.resolve(__dirname, '..', 'benchmark-results');

  // Load + flatten profile
  const rawProfile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  const profile: FlatProfile = flattenProfile(rawProfile);

  console.log('\n=== Web-Portal Benchmark ===');
  console.log(`Server:    ${serverUrl}`);
  console.log(`Instances: ${instances} per form`);
  console.log(`Profile:   ${Object.keys(profile).filter(k => !k.includes('[')).length} keys`);
  console.log(`Agents:    ${agent ?? 'all (rule-based, embedding-matcher, llm-structured)'}\n`);

  // Check Flask is up
  try {
    await fetch(`${serverUrl}`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); });
  } catch (err) {
    console.error(`Flask server not reachable at ${serverUrl}`);
    console.error(`Start it with: cd /d/Code/formfactory && python app.py`);
    process.exit(1);
  }

  const agentsToRun: Array<'rule-based' | 'embedding-matcher' | 'llm-structured'> =
    agent === 'rule-based'       ? ['rule-based'] :
    agent === 'embedding-matcher' ? ['embedding-matcher'] :
    agent === 'llm-structured'   ? ['llm-structured'] :
    ['rule-based', 'embedding-matcher', 'llm-structured'];

  const summary: Record<string, { fillRate: number; valueAccuracy: number }> = {};

  for (const agentName of agentsToRun) {
    console.log(`\n--- Running: ${agentName} ---\n`);
    const { results, totalMs } = await runAgent(agentName, profile, serverUrl, dataPath, instances, headless);
    const { avgFillRate, avgVA, text } = printReport(agentName, results, totalMs);

    summary[agentName] = { fillRate: avgFillRate, valueAccuracy: avgVA };

    // Save per-agent results
    const agentDir = path.join(outputDir, `web-portal-${agentName}`);
    fs.mkdirSync(agentDir, { recursive: true });
    fs.writeFileSync(
      path.join(agentDir, 'benchmark-report.json'),
      JSON.stringify({ agentName, timestamp: new Date().toISOString(), results, totalMs }, null, 2)
    );
    fs.writeFileSync(path.join(agentDir, 'benchmark-summary.txt'), text);
    console.log(`\nSaved to benchmark-results/web-portal-${agentName}/`);
  }

  // Print comparison table if all 3 ran
  if (agentsToRun.length > 1) {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║  COMPARISON SUMMARY                                          ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  ${'Agent'.padEnd(22)} ${'Fill Rate'.padStart(10)} ${'Value Acc.'.padStart(12)}  ║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    for (const [name, stats] of Object.entries(summary)) {
      console.log(`║  ${name.padEnd(22)} ${(stats.fillRate.toFixed(1) + '%').padStart(10)} ${(stats.valueAccuracy.toFixed(1) + '%').padStart(12)}  ║`);
    }
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Save comparison
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(
      path.join(outputDir, 'web-portal-comparison.json'),
      JSON.stringify({ timestamp: new Date().toISOString(), summary }, null, 2)
    );
  }
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
