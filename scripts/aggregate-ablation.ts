#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';

/**
 * Aggregator for Ablation JSONL records created by each track.
 * Scans Documentation/ablation-records/*.jsonl and produces
 * Documentation/ABLATION-MASTER-REPORT.md with a leaderboard.
 */

const AB_DIR = path.resolve(__dirname, '../Documentation/ablation-records');
const OUT_MD = path.resolve(__dirname, '../Documentation/ABLATION-MASTER-REPORT.md');

function safeReadJsonl(file: string) {
  const text = fs.readFileSync(file, 'utf-8').trim();
  if (text === '') return [];
  return text.split('\n').map(l => JSON.parse(l));
}

function aggregate() {
  if (!fs.existsSync(AB_DIR)) {
    console.error('No ablation-records directory found:', AB_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(AB_DIR).filter(f => f.endsWith('.jsonl'));
  const records: any[] = [];
  for (const f of files) {
    const p = path.join(AB_DIR, f);
    const recs = safeReadJsonl(p);
    records.push(...recs);
  }

  if (records.length === 0) {
    console.error('No ablation records found in', AB_DIR);
    process.exit(1);
  }

  const byKey: Record<string, any[]> = {};
  for (const r of records) {
    const track = r.track || 'unknown';
    const key = `${track}::${r.agent}`;
    byKey[key] = byKey[key] || [];
    byKey[key].push(r);
  }

  const rows: Array<{ track: string; agent: string; forms: number; avgValueAcc: number; avgTokens: number; avgCost: number; avgLlmTimeMs: number; avgLlmcalls: number }> = [];

  for (const [key, recs] of Object.entries(byKey)) {
    const [track, agent] = key.split('::');
    const forms = recs.length;
    // Handle both 'episodic.averageValueAccuracy' (extension) and 'valueAccuracyPct' (web-portal/mcp)
    const avgValueAcc = recs.reduce((s, r) => s + (r.valueAccuracyPct ?? r.episodic?.averageValueAccuracy ?? r.atomic?.overallValueAccuracy ?? 0), 0) / forms;
    const avgTokens = recs.reduce((s, r) => s + (r.tokensIn ?? 0) + (r.tokensOut ?? 0), 0) / forms;
    const avgCost = recs.reduce((s, r) => s + (r.estimatedCostUSD ?? 0), 0) / forms;
    const avgLlmTimeMs = recs.reduce((s, r) => s + (r.llmTimeMs ?? 0), 0) / forms;
    const avgLlmcalls = recs.reduce((s, r) => s + (r.llmCalls ?? 0), 0) / forms;

    rows.push({ track, agent, forms, avgValueAcc, avgTokens, avgCost, avgLlmTimeMs, avgLlmcalls });
  }

  rows.sort((a, b) => b.avgValueAcc - a.avgValueAcc);

  const lines: string[] = [];
  lines.push('# Ablation Master Report');
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push('');
  lines.push('| Rank | Track | Agent | Forms | Avg Value Acc | Avg Tokens | Avg Cost (USD) | Avg LLM ms | Avg LLM Calls |');
  lines.push('|------|-------|-------|-------:|-------------:|-----------:|---------------:|-----------:|--------------:|');

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    lines.push(`| ${i + 1} | ${r.track} | ${r.agent} | ${r.forms} | ${r.avgValueAcc.toFixed(1)}% | ${Math.round(r.avgTokens).toLocaleString()} | $${r.avgCost.toFixed(5)} | ${Math.round(r.avgLlmTimeMs)} | ${r.avgLlmcalls.toFixed(1)} |`);
  }

  lines.push('');
  lines.push('> Note: This report aggregates per-instance JSONL records produced by each track. Use the raw JSONL files in Documentation/ablation-records/ for deeper analysis.');

  fs.writeFileSync(OUT_MD, lines.join('\n'), 'utf-8');
  console.log('Wrote master report to', OUT_MD);
}

aggregate();
