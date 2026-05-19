#!/usr/bin/env ts-node

/**
 * FormFactory Benchmark CLI Runner
 * Usage:
 *   npm run test:benchmark               # Run default benchmark
 *   npm run test:quick                   # Quick test
 *   npm run test:full                    # Full benchmark
 *   npm run test:domain -- academic      # Test specific domain
 */

import { runFullBenchmark, runBenchmarkOnDomain } from '../src/benchmark/test-suite';
import { generateTestReport } from '../src/benchmark/test-runner';
import { BenchmarkAnalyzer } from '../src/benchmark/benchmark-analyzer';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const scenario = args[0] === '--scenario' ? args[1] : 'full';
  const domain = args[0] === '--domain' ? args[1] : null;

  console.log('🚀 FormFactory Benchmark Runner\n');

  try {
    let results;

    if (domain) {
      console.log(`📊 Testing domain: ${domain}\n`);
      results = await runBenchmarkOnDomain(domain, 5);
    } else if (scenario === 'quick') {
      console.log('⚡ Running quick benchmark...\n');
      results = await runFullBenchmark();
    } else {
      console.log('🔬 Running full benchmark...\n');
      results = await runFullBenchmark();
    }

    // Generate main report
    const report = generateTestReport(results);
    console.log(report);

    // Generate analysis
    const analysis = BenchmarkAnalyzer.analyze(results.results);
    const analysisReport = BenchmarkAnalyzer.generateReport(analysis);
    console.log(analysisReport);

    // Save results to file
    // Create results directory if it doesn't exist
    const resultsDir = './benchmark-results';
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsFile = path.join(resultsDir, `results-${timestamp}.json`);
    const analysisFile = path.join(resultsDir, `analysis-${timestamp}.json`);

    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));
    fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));

    console.log(`\n✅ Results saved to: ${resultsFile}`);
    console.log(`✅ Analysis saved to: ${analysisFile}`);
  } catch (error) {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  }
}

main();
