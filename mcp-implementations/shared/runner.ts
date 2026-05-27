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
import {
  ComparisonReport,
  FillResult,
  LiveForm,
  MCPFormFiller,
  UserProfile,
} from "./types.js";

const RESULTS_ROOT = path.resolve(__dirname, "../../benchmark-results");

interface CliArgs { impls: string[]; runs: number; }

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { impls: ["playwright-mcp"], runs: 1 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--impls") out.impls = argv[++i].split(",");
    else if (argv[i] === "--runs") out.runs = parseInt(argv[++i], 10);
  }
  return out;
}

async function loadImpl(name: string): Promise<MCPFormFiller> {
  // Dynamic import — each implementation lives in its own package.
  const modPath = path.resolve(__dirname, `../${name}/src/index.ts`);
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
    report.perImplementation[implName] = {
      runs: rs.length,
      successRate: rs.filter((r) => r.success).length / Math.max(1, rs.length),
      avgAccuracy: rs.reduce((s, r) => s + r.accuracy, 0) / Math.max(1, rs.length),
      avgDurationMs: rs.reduce((s, r) => s + r.durationMs, 0) / Math.max(1, rs.length),
      avgToolCalls: rs.reduce((s, r) => s + r.toolCalls, 0) / Math.max(1, rs.length),
      totalTokens: rs.reduce((s, r) => s + r.tokensIn + r.tokensOut, 0),
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
