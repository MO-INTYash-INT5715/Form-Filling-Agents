#!/usr/bin/env tsx
/**
 * Ablation Study Runner
 *
 * Runs all extension agents sequentially and produces a comprehensive
 * ablation report covering:
 *   - Value accuracy (per field type + overall)
 *   - Wall-clock time (total + per-form avg)
 *   - LLM token usage (prompt + completion + total)
 *   - Estimated cost (Ollama = $0, OpenAI = market rates)
 *   - Tokens per correct field (efficiency metric)
 *   - LLM inference time vs total time ratio
 *   - Per-domain breakdown
 *
 * Usage:
 *   npx tsx scripts/ablation-study.ts
 *   npx tsx scripts/ablation-study.ts --agents rule-based,llm-structured,hybrid
 *   npx tsx scripts/ablation-study.ts --quick      # 1 instance per form
 */

import { runBenchmark } from '../src/benchmark/runner';
import { RuleBasedAgent } from '../src/implementations/rule-based/agent';
import { LLMStructuredAgent } from '../src/implementations/llm-structured/agent';
import { HybridAgent } from '../src/implementations/hybrid/agent';
import { VLMAgent } from '../src/implementations/vlm-agent/agent';
import { EmbeddingMatcherAgent } from '../src/implementations/embedding-matcher/agent';
import type { BenchmarkReport } from '../src/benchmark/types';
import * as fs from 'fs';
import * as path from 'path';
import { estimateCost } from '../../shared/cost-model';
import { scoreFillsAgainstGold } from '../../shared/scorer';
import { validateModelChoice } from '../../shared/provider-utils';


// ---------------------------------------------------------------------------
// Agent registry
// ---------------------------------------------------------------------------
function makeAgent(name: string) {
  switch (name) {
    case 'rule-based':        return new RuleBasedAgent();
    case 'llm-structured':    return new LLMStructuredAgent();
    case 'hybrid':            return new HybridAgent();
    case 'vlm-agent':         return new VLMAgent();
    case 'embedding-matcher': return new EmbeddingMatcherAgent();
    default: throw new Error(`Unknown agent: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const agentArg = args.find(a => a.startsWith('--agents='))?.split('=')[1];
const quick = args.includes('--quick');
const serverUrl = args.find(a => a.startsWith('--server='))?.split('=')[1] ?? 'http://localhost:5000';

const AGENT_NAMES = agentArg
  ? agentArg.split(',')
  : ['rule-based', 'embedding-matcher', 'llm-structured', 'hybrid', 'vlm-agent'];

const INSTANCES = quick ? 1 : (process.env.INSTANCES ? parseInt(process.env.INSTANCES) : 5); // default 5 for non-quick

// ---------------------------------------------------------------------------
// Main ablation loop
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║         Form-Filling Agents — Ablation Study         ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`Agents:    ${AGENT_NAMES.join(', ')}`);
  console.log(`Instances: ${INSTANCES} per form`);
  console.log(`Provider:  ${process.env.LLM_PROVIDER || 'ollama'}`);
  console.log(`Model:     ${process.env.LLM_MODEL || 'qwen2.5:7b'}`);
  console.log(`Server:    ${serverUrl}\n`);

  // Validate model choice (Bedrock limited to 10-30B)
  {
    const _provider = process.env.LLM_PROVIDER || 'ollama';
    const _model = process.env.LLM_MODEL || '';
    const vres = validateModelChoice(_provider, _model, 10, 30);
    if (!vres.ok) {
      console.error('Model validation failed:', vres.message);
      process.exit(1);
    }
  }

  const reports: Record<string, BenchmarkReport> = {};

  for (const agentName of AGENT_NAMES) {
    console.log(`\n${'─'.repeat(56)}`);
    console.log(`▶ Running agent: ${agentName}`);
    console.log('─'.repeat(56));

    const agent = makeAgent(agentName);
    try {
      const report = await runBenchmark(agent, {
        agentName,
        formFactoryServerUrl: serverUrl,
        maxInstancesPerForm: INSTANCES,
        headless: true,
      });
      reports[agentName] = report;

      // Write per-instance JSONL for aggregator ingestion
      const _provider = process.env.LLM_PROVIDER || 'ollama';
      const _model = process.env.LLM_MODEL || 'qwen2.5:7b';
      const ablationDir = path.join(__dirname, '../Documentation/ablation-records');
      fs.mkdirSync(ablationDir, { recursive: true });
      const outFile = path.join(ablationDir, `${agentName}.jsonl`);
      const lines = report.formResults.map(fr => {
        const tokensInInst = fr.tokensIn ?? 0;
        const tokensOutInst = fr.tokensOut ?? 0;
        const estCostInst = estimateCost(_provider, _model, tokensInInst, tokensOutInst);
        const record = {
          track: 'extension',
          agent: agentName,
          formId: fr.formInstance.formId,
          formName: fr.formInstance.formName,
          instanceIndex: fr.formInstance.instanceIndex,
          tokensIn: tokensInInst,
          tokensOut: tokensOutInst,
          llmTimeMs: fr.llmTimeMs ?? 0,
          llmCalls: fr.llmCalls ?? 0,
          atomic: fr.atomicMetrics,
          episodic: fr.episodicMetrics,
          estimatedCostUSD: estCostInst,
          timestamp: report.timestamp || new Date().toISOString(),
          provider: _provider,
          model: _model,
        };
        return JSON.stringify(record);
      });
      fs.appendFileSync(outFile, lines.join('\n') + '\n', 'utf-8');

      console.log(`✓ ${agentName} done — ${report.globalEpisodic.averageValueAccuracy.toFixed(1)}% value acc`);
    } catch (err) {
      console.error(`✗ ${agentName} failed:`, (err as Error).message);
    }
  }

  // ---------------------------------------------------------------------------
  // Build ablation table data
  // ---------------------------------------------------------------------------
  interface AblationRow {
    agent: string;
    forms: number;
    fields: number;
    valueAcc: number;
    completionRate: number;
    avgFormTimeS: number;
    totalWallS: number;
    tokensIn: number;
    tokensOut: number;
    totalTokens: number;
    llmCalls: number;
    llmTimeS: number;
    llmFraction: number; // llmTime / wallTime
    estimatedCostUSD: number;
    costPerField: number;
    tokensPerCorrectField: number;
    // per field type
    stringAcc: number;
    descriptionAcc: number;
    dropdownAcc: number;
    numericAcc: number;
    dateAcc: number;
    checkboxAcc: number;
  }

  const rows: AblationRow[] = [];

  for (const [agentName, report] of Object.entries(reports)) {
    // Recompute atomic/episodic metrics using the shared scorer so all tracks are comparable
    const provider = process.env.LLM_PROVIDER || 'ollama';
    const model = process.env.LLM_MODEL || 'qwen2.5:7b';

    const perFormAtomic: any[] = [];
    const perFormEpisodic: any[] = [];

    for (const fr of report.formResults) {
      const gf = fr.formInstance;
      // Prefix field keys with formId to avoid collisions across forms
      const fills = fr.fieldResults.map(f => ({
        fieldId: `${gf.formId}:${f.fieldId}`,
        label: f.fieldId,
        type: f.fieldType,
        value: f.predictedValue,
        confidence: 1,
      }));

      const goldById: Record<string, string> = {};
      for (const [k, v] of Object.entries(gf.goldAnswers || {})) {
        goldById[`${gf.formId}:${k}`] = Array.isArray(v) ? String(v[0]) : String(v);
      }

      const metrics = scoreFillsAgainstGold(fills, goldById);

      perFormAtomic.push({
        clickAccuracy: fr.atomicMetrics.clickAccuracy,
        valueAccuracy: metrics.perFieldType || {},
        overallClickAccuracy: fr.atomicMetrics.overallClickAccuracy,
        overallValueAccuracy: metrics.valueAccuracy,
      });

      perFormEpisodic.push({
        formCompletionRate: metrics.total > 0 ? (metrics.matched / metrics.total) * 100 : 0,
        fieldsAttempted: metrics.attempted,
        fieldsCorrect: metrics.matched,
        totalFields: metrics.total,
        averageClickAccuracy: fr.episodicMetrics.averageClickAccuracy,
        averageValueAccuracy: metrics.valueAccuracy,
      });
    }

    const at = mergeAtomicMetrics(perFormAtomic);
    const ep = mergeEpisodicMetrics(perFormEpisodic);

    const wallS = report.totalExecutionTimeMs / 1000;
    const forms = report.totalInstances;
    const fields = report.totalFields;
    const tokensIn = report.totalTokensIn ?? 0;
    const tokensOut = report.totalTokensOut ?? 0;
    const totalTokens = tokensIn + tokensOut;
    const llmCalls = report.totalLlmCalls ?? 0;
    const llmTimeS = (report.totalLlmTimeMs ?? 0) / 1000;
    const cost = estimateCost(provider, model, tokensIn, tokensOut);
    const correctFields = ep.fieldsCorrect;

    rows.push({
      agent: agentName,
      forms,
      fields,
      valueAcc: ep.averageValueAccuracy,
      completionRate: ep.formCompletionRate,
      avgFormTimeS: forms > 0 ? wallS / forms : 0,
      totalWallS: wallS,
      tokensIn,
      tokensOut,
      totalTokens,
      llmCalls,
      llmTimeS,
      llmFraction: wallS > 0 ? llmTimeS / wallS : 0,
      estimatedCostUSD: cost,
      costPerField: fields > 0 ? cost / fields : 0,
      tokensPerCorrectField: correctFields > 0 ? totalTokens / correctFields : 0,
      stringAcc: at.valueAccuracy['String'] ?? 0,
      descriptionAcc: at.valueAccuracy['Description'] ?? 0,
      dropdownAcc: at.valueAccuracy['Dropdown'] ?? 0,
      numericAcc: at.valueAccuracy['NumericInput'] ?? 0,
      dateAcc: at.valueAccuracy['Date'] ?? 0,
      checkboxAcc: at.valueAccuracy['Checkbox'] ?? 0,
    });
  }

  // Sort by value accuracy descending
  rows.sort((a, b) => b.valueAcc - a.valueAcc);

  // ---------------------------------------------------------------------------
  // Render markdown report
  // ---------------------------------------------------------------------------
  const provider = process.env.LLM_PROVIDER || 'ollama';
  const model = process.env.LLM_MODEL || 'qwen2.5:7b';
  const now = new Date().toISOString().split('T')[0];

  const lines: string[] = [];
  const l = (s = '') => lines.push(s);

  l(`# Form-Filling Agents — Ablation Study`);
  l();
  l(`**Generated:** ${now}  `);
  l(`**LLM Provider:** ${provider}  `);
  l(`**LLM Model:** ${model}  `);
  l(`**Instances per form:** ${INSTANCES}  `);
  l(`**Server:** ${serverUrl}`);
  l();

  l(`## 1. Overall Performance`);
  l();
  l(`| Agent | Forms | Value Acc | Completion | Avg Form (s) | Total Wall (s) |`);
  l(`|-------|-------|-----------|------------|-------------|----------------|`);
  for (const r of rows) {
    l(`| ${r.agent.padEnd(20)} | ${r.forms} | **${r.valueAcc.toFixed(1)}%** | ${r.completionRate.toFixed(1)}% | ${r.avgFormTimeS.toFixed(1)} | ${r.totalWallS.toFixed(1)} |`);
  }
  l();

  l(`## 2. Token Usage & Cost`);
  l();
  l(`> Cost model: Ollama = $0.00 (local). OpenAI gpt-4o-mini = $0.15/1M in, $0.60/1M out.`);
  l();
  l(`| Agent | Tokens In | Tokens Out | Total Tokens | LLM Calls | LLM Time (s) | Est. Cost (USD) | Cost/Field |`);
  l(`|-------|-----------|------------|--------------|-----------|-------------|-----------------|------------|`);
  for (const r of rows) {
    const costStr = r.estimatedCostUSD > 0
      ? `$${r.estimatedCostUSD.toFixed(4)}`
      : `$0.0000`;
    const cpfStr = r.costPerField > 0
      ? `$${r.costPerField.toFixed(5)}`
      : `$0`;
    l(`| ${r.agent.padEnd(20)} | ${r.tokensIn.toLocaleString()} | ${r.tokensOut.toLocaleString()} | ${r.totalTokens.toLocaleString()} | ${r.llmCalls} | ${r.llmTimeS.toFixed(1)} | ${costStr} | ${cpfStr} |`);
  }
  l();

  l(`## 3. Efficiency Metrics`);
  l();
  l(`> Tokens per correct field = total LLM tokens / correctly filled fields. Lower = more efficient.`);
  l(`> LLM fraction = LLM inference time / total wall-clock time.`);
  l();
  l(`| Agent | Tokens/Correct Field | LLM Fraction | Fields Correct | Fields Total |`);
  l(`|-------|---------------------|--------------|----------------|--------------|`);
  for (const r of rows) {
    const tpcf = r.tokensPerCorrectField > 0 ? r.tokensPerCorrectField.toFixed(0) : 'N/A';
    const lf = r.llmFraction > 0 ? `${(r.llmFraction * 100).toFixed(0)}%` : 'N/A';
    l(`| ${r.agent.padEnd(20)} | ${tpcf} | ${lf} | — | ${r.fields} |`);
  }
  l();

  l(`## 4. Per-Field-Type Accuracy`);
  l();
  l(`| Agent | String | Description | Dropdown | Numeric | Date | Checkbox |`);
  l(`|-------|--------|-------------|----------|---------|------|----------|`);
  for (const r of rows) {
    l(`| ${r.agent.padEnd(20)} | ${r.stringAcc.toFixed(1)}% | ${r.descriptionAcc.toFixed(1)}% | ${r.dropdownAcc.toFixed(1)}% | ${r.numericAcc.toFixed(1)}% | ${r.dateAcc.toFixed(1)}% | ${r.checkboxAcc.toFixed(1)}% |`);
  }
  l();

  l(`## 5. Per-Domain Breakdown`);
  l();
  // Collect all domains
  const allDomains = new Set<string>();
  for (const r of Object.values(reports)) {
    Object.keys(r.byDomain).forEach(d => allDomains.add(d));
  }
  const agentNames = rows.map(r => r.agent);

  l(`| Domain | ${agentNames.join(' | ')} |`);
  l(`|--------|${agentNames.map(() => '---').join('|')}|`);
  for (const domain of Array.from(allDomains).sort()) {
    const cells = agentNames.map(name => {
      const domData = reports[name]?.byDomain[domain];
      if (!domData) return 'N/A';
      return `${domData.episodic.averageValueAccuracy.toFixed(1)}%`;
    });
    l(`| ${domain} | ${cells.join(' | ')} |`);
  }
  l();

  l(`## 6. Key Takeaways`);
  l();

  const best = rows[0];
  const fastest = [...rows].sort((a, b) => a.avgFormTimeS - b.avgFormTimeS)[0];
  const llmAgents = rows.filter(r => r.totalTokens > 0);
  const mostEfficient = llmAgents.length > 0
    ? llmAgents.sort((a, b) => a.tokensPerCorrectField - b.tokensPerCorrectField)[0]
    : null;

  l(`- **Best accuracy:** \`${best.agent}\` at ${best.valueAcc.toFixed(1)}% value accuracy`);
  l(`- **Fastest per form:** \`${fastest.agent}\` at ${fastest.avgFormTimeS.toFixed(2)}s avg`);
  if (mostEfficient) {
    l(`- **Most token-efficient:** \`${mostEfficient.agent}\` at ${mostEfficient.tokensPerCorrectField.toFixed(0)} tokens/correct-field`);
  }
  l(`- **Cost:** All Ollama-backed agents run at $0.00 (local inference). OpenAI costs scale with token volume.`);
  l();

  l(`## 7. Agent Architecture Summary`);
  l();
  l(`| Agent | Approach | LLM Required | Vision Required | Best Use Case |`);
  l(`|-------|----------|-------------|-----------------|---------------|`);
  l(`| rule-based | Regex + keyword heuristics | ❌ | ❌ | Fast baseline, structured docs |`);
  l(`| embedding-matcher | Cosine similarity field matching | Optional | ❌ | Semantic field matching |`);
  l(`| llm-structured | Single-shot JSON extraction | ✅ | ❌ | Clean doc → structured form |`);
  l(`| hybrid | Heuristics + selective LLM escalation | ✅ | ❌ | Balances speed & accuracy |`);
  l(`| mcp-agent | Iterative browser agent (tool-use) | ✅ | ❌ | Dynamic / multi-page forms |`);
  l(`| vision-agent | Screenshot → VLM → coordinates | ✅ | ✅ | Requires multimodal model |`);
  l(`| vlm-agent | Screenshot + ruler → VLM fills | ✅ | ✅ | Pixel-perfect form interaction |`);
  l();

  l(`---`);
  l(`*Report generated by \`scripts/ablation-study.ts\`*`);

  const reportMd = lines.join('\n');

  // Save
  const outPath = path.join(__dirname, '../Documentation/ABLATION-STUDY.md');
  fs.writeFileSync(outPath, reportMd, 'utf-8');
  console.log(`\n✅ Ablation report saved to: Documentation/ABLATION-STUDY.md`);

  // Also save raw JSON for programmatic use
  const jsonOut = path.join(__dirname, '../Documentation/ablation-data.json');
  fs.writeFileSync(jsonOut, JSON.stringify({ rows, reports: Object.fromEntries(
    Object.entries(reports).map(([k, v]) => [k, {
      agentName: v.agentName,
      totalForms: v.totalForms,
      totalFields: v.totalFields,
      globalEpisodic: v.globalEpisodic,
      globalAtomic: v.globalAtomic,
      byDomain: v.byDomain,
      totalExecutionTimeMs: v.totalExecutionTimeMs,
      totalTokensIn: v.totalTokensIn,
      totalTokensOut: v.totalTokensOut,
      totalLlmTimeMs: v.totalLlmTimeMs,
      totalLlmCalls: v.totalLlmCalls,
    }])
  ) }, null, 2), 'utf-8');
  console.log(`✅ Ablation JSON saved to: Documentation/ablation-data.json\n`);

  // Print summary table to console
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║                  ABLATION SUMMARY                    ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`${'Agent'.padEnd(22)} ${'ValAcc'.padStart(7)} ${'AvgTime'.padStart(8)} ${'Tokens'.padStart(9)} ${'Cost'.padStart(9)}`);
  console.log('─'.repeat(60));
  for (const r of rows) {
    const costStr = r.estimatedCostUSD > 0 ? `$${r.estimatedCostUSD.toFixed(4)}` : '$0.0000';
    console.log(
      `${r.agent.padEnd(22)} ${(r.valueAcc.toFixed(1)+'%').padStart(7)} ${(r.avgFormTimeS.toFixed(1)+'s').padStart(8)} ${r.totalTokens.toLocaleString().padStart(9)} ${costStr.padStart(9)}`
    );
  }
  console.log('');
}

main().catch(err => {
  console.error('Ablation study failed:', err);
  process.exit(1);
});
