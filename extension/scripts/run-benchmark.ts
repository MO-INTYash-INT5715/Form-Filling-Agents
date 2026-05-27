#!/usr/bin/env ts-node

/**
 * FormFactory Benchmark CLI Runner
 *
 * Prerequisites:
 *   1. Clone the FormFactory repo:
 *      git clone https://github.com/formfactory-ai/formfactory.git c:\Code\formfactory
 *
 *   2. Start the Flask server (in a separate terminal):
 *      cd c:\Code\formfactory
 *      pip install -r requirements.txt
 *      python app.py
 *
 *   3. Install Playwright:
 *      npm install playwright
 *      npx playwright install chromium
 *
 * Usage:
 *   npm run benchmark:quick               # 1 instance per form, all 25 forms
 *   npm run benchmark:full                # 50 instances per form (paper scale)
 *   npm run benchmark:form -- --form job_applications
 *   npm run benchmark:domain -- --domain "Finance & Banking"
 *   npm run benchmark:watch               # headless=false, watch the browser
 */

import { runBenchmark } from '../src/benchmark/runner';
import { availableDomains, availableFormStems } from '../src/benchmark/dataset-loader';
import { SCENARIOS } from '../src/benchmark/config';
import type { BenchmarkConfig } from '../src/benchmark/config';

// ---------------------------------------------------------------------------
// Rule-based agent (placeholder — wires up src/implementations/rule-based)
// ---------------------------------------------------------------------------
// This demo agent simply reads the inputDocument and attempts naive keyword
// extraction to fill fields. Replace with a real implementation.

import { RuleBasedAgent } from '../src/implementations/rule-based/agent';

// The Demo agent was here, replaced by RuleBasedAgent from implementations


// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): {
  scenario: 'quick' | 'full' | 'custom';
  instances: number;
  form?: string;
  domain?: string;
  watch: boolean;
  serverUrl: string;
  agentName: string;
} {
  const args = process.argv.slice(2);
  let scenario: 'quick' | 'full' | 'custom' = 'quick';
  let instances = 1;
  let form: string | undefined;
  let domain: string | undefined;
  let watch = false;
  let serverUrl = 'http://localhost:5000';

  let agentName = 'rule-based';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--quick':    scenario = 'quick'; instances = 1; break;
      case '--full':     scenario = 'full';  instances = 50; break;
      case '--watch':    watch = true; break;
      case '--instances': instances = parseInt(args[++i] ?? '1', 10); scenario = 'custom'; break;
      case '--form':     form = args[++i]; break;
      case '--domain':   domain = args[++i]; break;
      case '--server':   serverUrl = args[++i]; break;
      case '--agent':    agentName = args[++i]; break;
      case '--list-forms':
        console.log('Available form stems:');
        availableFormStems().forEach(s => console.log(' ', s));
        process.exit(0);
        break;
      case '--list-domains':
        console.log('Available domains:');
        availableDomains().forEach(d => console.log(' ', d));
        process.exit(0);
        break;
    }
  }

  return { scenario, instances, form, domain, watch, serverUrl, agentName };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { scenario, instances, form, domain, watch, serverUrl, agentName } = parseArgs();

  // Build domain filter → form stems
  let formIds: string[] | undefined;
  if (form) {
    formIds = [form];
  } else if (domain) {
    const { FORM_CATALOGUE } = await import('../src/benchmark/dataset-loader');
    formIds = FORM_CATALOGUE
      .filter(f => f.domain.toLowerCase().includes(domain.toLowerCase()))
      .map(f => f.dataStem);
    if (formIds.length === 0) {
      console.error(`No forms found for domain: "${domain}"`);
      console.log('Use --list-domains to see available domains');
      process.exit(1);
    }
  }

  const config: Partial<BenchmarkConfig> = {
    formFactoryServerUrl: serverUrl,
    maxInstancesPerForm: instances,
    headless: !watch,
    formIds,
    agentName,
  };

  let agent;
  if (agentName === 'mcp-agent') {
    const { MCPAgent } = await import('../src/implementations/mcp-agent/agent');
    agent = new MCPAgent();
  } else if (agentName === 'vision-agent') {
    const { VisionAgent } = await import('../src/implementations/vision-agent/agent');
    agent = new VisionAgent();
  } else if (agentName === 'vlm-agent') {
    const { VLMAgent } = await import('../src/implementations/vlm-agent/agent');
    agent = new VLMAgent();
  } else if (agentName === 'llm-structured') {
    const { LLMStructuredAgent } = await import('../src/implementations/llm-structured/agent');
    agent = new LLMStructuredAgent();
  } else if (agentName === 'hybrid') {
    const { HybridAgent } = await import('../src/implementations/hybrid/agent');
    agent = new HybridAgent();
  } else if (agentName === 'embedding-matcher' || agentName === 'embedding') {
    const { EmbeddingMatcherAgent } = await import('../src/implementations/embedding-matcher/agent');
    agent = new EmbeddingMatcherAgent();
  } else {
    agent = new RuleBasedAgent();
  }

  try {
    const report = await runBenchmark(agent, config);

    // Exit code reflects success
    process.exit(report.errors.length > 10 ? 1 : 0);
  } catch (err) {
    console.error('\n❌ Benchmark failed:', (err as Error).message);
    console.error('\nTroubleshooting:');
    console.error('  1. Is the Flask server running? → cd c:\\Code\\formfactory && python app.py');
    console.error('  2. Is Playwright installed? → npm install playwright && npx playwright install chromium');
    console.error('  3. Is the FormFactory repo cloned? → c:\\Code\\formfactory\\data\\ should exist');
    process.exit(1);
  }
}

main();
