/**
 * FormFactory Benchmark — Main Runner
 *
 * Orchestrates the end-to-end benchmark loop:
 *   1. Load FormInstances from the real dataset (data1/ + data2/)
 *   2. For each instance, run the agent's analyze() to get an ActionTrace
 *   3. Execute the trace via Playwright against the live Flask server
 *   4. Score results using the paper's evaluation metrics
 *   5. Save per-form JSON results + aggregated BenchmarkReport
 *
 * Usage:
 *   import { runBenchmark } from './runner';
 *   const report = await runBenchmark({ agentName: 'rule-based', maxInstancesPerForm: 1 });
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadDataset } from './dataset-loader';
import { PlaywrightFormExecutor } from './playwright-executor';
import { mergeAtomicMetrics, mergeEpisodicMetrics } from './evaluation';
import { createConfig } from './config';
import type { BenchmarkConfig } from './config';
import type { FormInstance, FormResult, BenchmarkReport, AgentAction } from './types';

import type { BenchmarkAgent } from './types';
// ---------------------------------------------------------------------------
// Progress callback
// ---------------------------------------------------------------------------

export interface RunnerProgress {
  formId: string;
  formName: string;
  instanceIndex: number;
  completed: number;
  total: number;
  currentMetrics?: { clickAcc: number; valueAcc: number };
}

export type ProgressCallback = (progress: RunnerProgress) => void;

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export async function runBenchmark(
  agent: BenchmarkAgent,
  configOverrides: Partial<BenchmarkConfig> = {},
  onProgress?: ProgressCallback
): Promise<BenchmarkReport> {
  const config = createConfig({
    agentName: agent.name,
    ...configOverrides,
  });

  console.log(`\n🚀 FormFactory Benchmark — Agent: "${config.agentName}"`);
  console.log(`   Server:     ${config.formFactoryServerUrl}`);
  console.log(`   Data path:  ${config.formFactoryDataPath}`);
  console.log(`   Instances:  ${config.maxInstancesPerForm} per form`);
  console.log(`   Headless:   ${config.headless}\n`);

  // Ensure output directory exists
  fs.mkdirSync(config.outputDir, { recursive: true });

  // 1. Load dataset
  console.log('📦 Loading dataset...');
  const instances = loadDataset({
    formFactoryPath: config.formFactoryDataPath,
    formStems: config.formIds,
    maxInstancesPerForm: config.maxInstancesPerForm,
  });
  console.log(`   Loaded ${instances.length} form instance(s)\n`);

  if (instances.length === 0) {
    throw new Error(
      'No instances loaded. Check that the FormFactory repo is at ' +
      config.formFactoryDataPath
    );
  }

  // 2. Init Playwright executor
  const executor = new PlaywrightFormExecutor(config);
  await executor.init();
  console.log('🌐 Browser started\n');

  const allResults: FormResult[] = [];
  const startTime = Date.now();

  try {
    for (let i = 0; i < instances.length; i++) {
      const instance = instances[i];
      const label = `[${i + 1}/${instances.length}] ${instance.formName} #${instance.instanceIndex}`;
      console.log(`📝 ${label}`);

      let formResult: FormResult;
      try {
        if (agent.runIterative) {
          formResult = await executor.executeIterative(instance, agent, config.agentName);
        } else if (agent.planActions) {
          const actions = await agent.planActions(instance);
          console.log(`   → Agent produced ${actions.length} action(s)`);
          formResult = await executor.execute(instance, actions, config.agentName);
        } else {
          throw new Error('Agent must implement planActions or runIterative');
        }
        console.log(
          `   ✅ Value acc: ${formResult.episodicMetrics.averageValueAccuracy.toFixed(1)}%` +
          `  Click acc: ${formResult.episodicMetrics.averageClickAccuracy.toFixed(1)}%` +
          `  Fields: ${formResult.episodicMetrics.fieldsCorrect}/${formResult.episodicMetrics.totalFields}`
        );
        if (formResult.errors.length > 0) {
          console.warn(`   ⚠️  ${formResult.errors.length} error(s):`, formResult.errors[0]);
        }
      } catch (err) {
        console.error(`   ❌ Execution failed:`, (err as Error).message);
        // Create empty result for this instance
        formResult = createEmptyFormResult(instance, config.agentName, (err as Error).message);
      }

      allResults.push(formResult);

      // Save per-form JSON
      const resultFile = path.join(
        config.outputDir,
        `${instance.formId}_${instance.instanceIndex}.json`
      );
      fs.writeFileSync(resultFile, JSON.stringify(formResult, null, 2), 'utf-8');

      // Progress callback
      onProgress?.({
        formId: instance.formId,
        formName: instance.formName,
        instanceIndex: instance.instanceIndex,
        completed: i + 1,
        total: instances.length,
        currentMetrics: {
          clickAcc: formResult.episodicMetrics.averageClickAccuracy,
          valueAcc: formResult.episodicMetrics.averageValueAccuracy,
        },
      });
    }
  } finally {
    await executor.close();
    console.log('\n🔒 Browser closed');
  }

  // 3. Aggregate global metrics
  const report = buildReport(config, allResults, Date.now() - startTime);

  // Save full report
  const reportFile = path.join(config.outputDir, 'benchmark-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf-8');

  // Generate text summary
  const summary = generateTextReport(report);
  const summaryFile = path.join(config.outputDir, 'benchmark-summary.txt');
  fs.writeFileSync(summaryFile, summary, 'utf-8');
  console.log('\n' + summary);

  console.log(`\n✅ Report saved to: ${reportFile}`);
  console.log(`   Summary:    ${summaryFile}`);

  return report;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEmptyFormResult(
  instance: FormInstance,
  agentName: string,
  error: string
): FormResult {
  return {
    formInstance: instance,
    agentName,
    fieldResults: [],
    atomicMetrics: {
      clickAccuracy: {},
      valueAccuracy: {},
      overallClickAccuracy: 0,
      overallValueAccuracy: 0,
    },
    episodicMetrics: {
      formCompletionRate: 0,
      fieldsAttempted: 0,
      fieldsCorrect: 0,
      totalFields: 0,
      averageClickAccuracy: 0,
      averageValueAccuracy: 0,
    },
    executionTimeMs: 0,
    errors: [error],
    submissionSucceeded: false,
  };
}

function buildReport(
  config: BenchmarkConfig,
  results: FormResult[],
  totalMs: number
): BenchmarkReport {
  const globalAtomic = mergeAtomicMetrics(results.map(r => r.atomicMetrics));
  const globalEpisodic = mergeEpisodicMetrics(results.map(r => r.episodicMetrics));

  // Per-domain breakdown
  const byDomain: BenchmarkReport['byDomain'] = {};
  for (const r of results) {
    const d = r.formInstance.domain;
    if (!byDomain[d]) {
      byDomain[d] = {
        domain: d,
        instanceCount: 0,
        atomic: { clickAccuracy: {}, valueAccuracy: {}, overallClickAccuracy: 0, overallValueAccuracy: 0 },
        episodic: { formCompletionRate: 0, fieldsAttempted: 0, fieldsCorrect: 0, totalFields: 0, averageClickAccuracy: 0, averageValueAccuracy: 0 },
      };
    }
    byDomain[d].instanceCount++;
  }
  for (const domain of Object.keys(byDomain)) {
    const domainResults = results.filter(r => r.formInstance.domain === domain);
    byDomain[domain].atomic = mergeAtomicMetrics(domainResults.map(r => r.atomicMetrics));
    byDomain[domain].episodic = mergeEpisodicMetrics(domainResults.map(r => r.episodicMetrics));
  }

  return {
    agentName: config.agentName,
    timestamp: new Date().toISOString(),
    config: {
      formFactoryServerUrl: config.formFactoryServerUrl,
      formIds: config.formIds ?? 'all',
      instancesPerForm: config.maxInstancesPerForm,
    },
    totalForms: new Set(results.map(r => r.formInstance.formId)).size,
    totalInstances: results.length,
    totalFields: results.reduce((s, r) => s + r.episodicMetrics.totalFields, 0),
    globalAtomic,
    globalEpisodic,
    byDomain,
    formResults: results,
    totalExecutionTimeMs: totalMs,
    errors: results.flatMap(r => r.errors),
  };
}

function generateTextReport(report: BenchmarkReport): string {
  const lines: string[] = [];
  const line = (s = '') => lines.push(s);

  line('╔══════════════════════════════════════════════════════════════╗');
  line('║      FormFactory Benchmark Report (Real Dataset)             ║');
  line('╚══════════════════════════════════════════════════════════════╝');
  line();
  line(`  Agent:      ${report.agentName}`);
  line(`  Timestamp:  ${report.timestamp}`);
  line(`  Forms:      ${report.totalForms}`);
  line(`  Instances:  ${report.totalInstances}`);
  line(`  Fields:     ${report.totalFields}`);
  line(`  Runtime:    ${(report.totalExecutionTimeMs / 1000).toFixed(1)}s`);
  line();
  line('━━━ GLOBAL METRICS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  line(`  Overall Click Accuracy:  ${report.globalAtomic.overallClickAccuracy.toFixed(2)}%`);
  line(`  Overall Value Accuracy:  ${report.globalAtomic.overallValueAccuracy.toFixed(2)}%`);
  line(`  Form Completion Rate:    ${report.globalEpisodic.formCompletionRate.toFixed(2)}%`);
  line(`  Fields Correct:          ${report.globalEpisodic.fieldsCorrect} / ${report.globalEpisodic.totalFields}`);
  line();
  line('━━━ PER FIELD TYPE (Click / Value) ━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const allTypes = new Set([
    ...Object.keys(report.globalAtomic.clickAccuracy),
    ...Object.keys(report.globalAtomic.valueAccuracy),
  ]);
  for (const ft of [...allTypes].sort()) {
    const click = (report.globalAtomic.clickAccuracy[ft] ?? 0).toFixed(1);
    const val = (report.globalAtomic.valueAccuracy[ft] ?? 0).toFixed(1);
    line(`  ${ft.padEnd(18)} Click: ${click.padStart(6)}%  Value: ${val.padStart(6)}%`);
  }
  line();
  line('━━━ PER DOMAIN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  for (const [domain, stats] of Object.entries(report.byDomain)) {
    line(`  ${domain}`);
    line(`    Click: ${stats.atomic.overallClickAccuracy.toFixed(1)}%  Value: ${stats.atomic.overallValueAccuracy.toFixed(1)}%  Completion: ${stats.episodic.formCompletionRate.toFixed(1)}%  (${stats.instanceCount} inst.)`);
  }
  line();
  line('══════════════════════════════════════════════════════════════');
  if (report.errors.length > 0) {
    line(`⚠️  ${report.errors.length} error(s) encountered (see benchmark-report.json)`);
  }

  return lines.join('\n');
}
