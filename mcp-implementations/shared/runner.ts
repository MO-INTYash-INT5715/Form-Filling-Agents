/**
 * Comparison harness — runs all available MCP implementations across
 * the live-form set and writes a comparison report.
 *
 * Each implementation must be importable as a default-export factory
 * returning an MCPFormFiller (see types.ts).
 *
 * Usage:
 *   npx tsx mcp-implementations/shared/runner.ts \
 *     --impls playwright-mcp,browser-mcp,skyvern-mcp \
 *     --runs 3
 */

import fs from "node:fs";
import path from "node:path";
import { estimateCost } from '../../shared/cost-model';
import { validateModelChoice } from '../../shared/provider-utils';
import {
  ComparisonReport,
  FillResult,
  LiveForm,
  MCPFormFiller,
  UserProfile,
} from "./types.js";

const RESULTS_ROOT = path.resolve(process.cwd(), "benchmark-results");

interface CliArgs { impls: string[]; runs: number; }

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { impls: ["rule-based", "embedding-matcher", "llm-structured", "hybrid", "vlm-agent"], runs: 1 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--impls") out.impls = argv[++i].split(",");
    else if (argv[i] === "--runs") out.runs = parseInt(argv[++i], 10);
  }
  return out;
}

async function loadImpl(name: string): Promise<MCPFormFiller> {
  // Load the agent directly from playwright-mcp/src/agents
  const modPath = path.resolve(__dirname, `../playwright-mcp/src/agents/${name}.ts`);
  if (!fs.existsSync(modPath)) {
    throw new Error(`Implementation ${name} not found at ${modPath}`);
  }
  const mod = await import(modPath);
  return mod.createFiller();
}

async function runOne(
  impl: MCPFormFiller,
  form: LiveForm,
  profile: UserProfile,
): Promise<FillResult> {
  const started = new Date().toISOString();
  try {
    const r = await impl.fill(form.url, profile);
    return { ...r, formId: form.id, startedAt: started };
  } catch (e: any) {
    return {
      implementation: impl.name,
      formId: form.id,
      url: form.url,
      success: false,
      fieldsAttempted: 0,
      fieldsFilled: 0,
      fieldsExpected: form.expectedFields.length,
      accuracy: 0,
      durationMs: 0,
      toolCalls: 0,
      tokensIn: 0,
      tokensOut: 0,
      error: String(e?.message ?? e),
      failureCategory: "other",
      startedAt: started,
      finishedAt: new Date().toISOString(),
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

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
  const formsPath = path.resolve(__dirname, "live-forms.json");
  const profilePath = path.resolve(__dirname, "user-profile.json");
  const forms: LiveForm[] = JSON.parse(fs.readFileSync(formsPath, "utf8")).forms;
  const profile: UserProfile = JSON.parse(fs.readFileSync(profilePath, "utf8"));

  const allResults: FillResult[] = [];

  for (const implName of args.impls) {
    console.log(`\n=== Loading implementation: ${implName} ===`);
    const impl = await loadImpl(implName);
    await impl.init();
    try {
      for (const form of forms) {
        for (let r = 0; r < args.runs; r++) {
          console.log(`  ${implName} ▸ ${form.id} (run ${r + 1}/${args.runs})`);
          const res = await runOne(impl, form, profile);
          allResults.push(res);
          const dir = path.join(RESULTS_ROOT, `mcp-${implName}`);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(
            path.join(dir, `${form.id}_${r}.json`),
            JSON.stringify(res, null, 2),
          );

          // Also append AblationRecord JSONL for aggregator
          try {
            const { scoreFillsAgainstGold } = await import('../../shared/scorer');
            
            // Build gold answers from profile and expected fields
            const goldAnswers: Record<string, string> = {};
            for (const fieldPath of form.expectedFields) {
              const parts = fieldPath.split('.');
              let val: any = profile;
              for (const part of parts) {
                if (val) val = val[part];
              }
              if (val !== undefined && val !== null) {
                goldAnswers[fieldPath] = String(val);
              }
            }
            
            // Calculate value accuracy if we have recorded fills
            let valueAccuracyPct = 0;
            if (res.fields && res.fields.length > 0) {
              const score = scoreFillsAgainstGold(res.fields, goldAnswers);
              valueAccuracyPct = score.valueAccuracy;
              res.accuracy = score.valueAccuracy; // update the result accuracy too
            }

            const ablationDir = path.resolve(__dirname, '../../Documentation/ablation-records');
            fs.mkdirSync(ablationDir, { recursive: true });
            const abRec = {
              track: 'mcp',
              agent: implName,
              implementation: impl.name,
              provider: process.env.LLM_PROVIDER || 'ollama',
              model: process.env.LLM_MODEL || 'unknown',
              formId: form.id,
              instanceRun: r,
              fieldsExpected: res.fieldsExpected,
              fieldsAttempted: res.fieldsAttempted,
              fieldsFilled: res.fieldsFilled,
              accuracy: res.accuracy,
              valueAccuracyPct,
              tokensIn: res.tokensIn ?? 0,
              tokensOut: res.tokensOut ?? 0,
              toolCalls: res.toolCalls ?? 0,
              durationMs: res.durationMs,
              success: res.success,
              startedAt: res.startedAt,
              finishedAt: res.finishedAt,
              error: res.error,
            };
            fs.appendFileSync(path.join(ablationDir, `${implName}.jsonl`), JSON.stringify(abRec) + '\n', 'utf-8');
          } catch (e) { /* ignore */ }
        }
      }
    } finally {
      await impl.close();
    }
  }

  // Aggregate
  const report: ComparisonReport = {
    generatedAt: new Date().toISOString(),
    implementations: args.impls,
    forms: forms.map((f) => f.id),
    perImplementation: {},
  };
  for (const implName of args.impls) {
    const rs = allResults.filter((r) => r.implementation === implName);
    const failures: Record<string, number> = {};
    rs.forEach((r) => {
      if (!r.success) {
        const k = r.failureCategory ?? "other";
        failures[k] = (failures[k] ?? 0) + 1;
      }
    });
    const tokensInTotal = rs.reduce((s, r) => s + (r.tokensIn ?? 0), 0);
    const tokensOutTotal = rs.reduce((s, r) => s + (r.tokensOut ?? 0), 0);
    const provider = process.env.LLM_PROVIDER || 'ollama';
    const model = process.env.LLM_MODEL || 'qwen2.5:7b';
    const estimatedCost = estimateCost(provider, model, tokensInTotal, tokensOutTotal);

    report.perImplementation[implName] = {
      runs: rs.length,
      successRate: rs.filter((r) => r.success).length / Math.max(1, rs.length),
      avgAccuracy: rs.reduce((s, r) => s + r.accuracy, 0) / Math.max(1, rs.length),
      avgDurationMs: rs.reduce((s, r) => s + r.durationMs, 0) / Math.max(1, rs.length),
      avgToolCalls: rs.reduce((s, r) => s + r.toolCalls, 0) / Math.max(1, rs.length),
      totalTokens: tokensInTotal + tokensOutTotal,
      estimatedCostUSD: estimatedCost,
      failureBreakdown: failures,
    };
  }

  const reportPath = path.join(RESULTS_ROOT, "mcp-comparison.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nWrote ${reportPath}`);
  console.table(report.perImplementation);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
