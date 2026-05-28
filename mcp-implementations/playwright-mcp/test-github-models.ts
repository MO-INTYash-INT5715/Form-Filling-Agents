#!/usr/bin/env tsx
/**
 * Test GitHub Models API access with the configured credentials
 * 
 * This reproduces the 403 error we're seeing when MCP agent tries to use LLM.
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const BASE_URL = process.env.LLM_BASE_URL || 'https://models.github.ai/inference';
const MODEL = process.env.LLM_MODEL || 'openai/gpt-4.1-mini';

async function testGitHubModels() {
  console.log('=== GitHub Models API Test ===\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Model: ${MODEL}`);
  console.log(`Token: ${GITHUB_TOKEN ? GITHUB_TOKEN.slice(0, 20) + '...' : '(not set — OK for local Ollama)'}\n`);

  // For local Ollama, token is optional
  const isLocal = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');
  
  if (!GITHUB_TOKEN && !isLocal) {
    console.error('❌ GITHUB_TOKEN not set in .env (required for non-local endpoints)');
    process.exit(1);
  }

  const client = new OpenAI({
    baseURL: BASE_URL,
    apiKey: GITHUB_TOKEN || 'ollama', // Ollama doesn't validate the key
  });

  console.log('[1/3] Testing basic API connectivity...');
  
  try {
    console.log('[2/3] Listing available models...');
    const models = await client.models.list();
    console.log(`✓ Found ${models.data.length} models:`);
    models.data.slice(0, 10).forEach(m => console.log(`  - ${m.id}`));
    console.log('');
  } catch (err: any) {
    console.error(`✗ Failed to list models: ${err.message}\n`);
  }

  console.log('[3/3] Testing chat completion...');
  
  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "test successful" if you can read this.' }
      ],
      max_tokens: 20,
    });

    const response = completion.choices[0]?.message?.content || '';
    console.log(`✓ Response: ${response}\n`);
    console.log('✅ GitHub Models API is working!\n');
    
  } catch (err: any) {
    console.error(`\n❌ CHAT COMPLETION FAILED\n`);
    console.error(`Error: ${err.message}`);
    
    if (err.status === 403) {
      console.error(`\n🔒 403 Forbidden — This is the MCP blocker!\n`);
      console.error(`Root cause: Your GitHub account lacks access to GitHub Models.`);
      console.error(`\nRequired:`);
      console.error(`  1. GitHub Copilot subscription (Individual/Business/Enterprise)`);
      console.error(`  2. GitHub Models beta access (separate opt-in)`);
      console.error(`\nWorkarounds:`);
      console.error(`  → Option A: Get Copilot → Enable Models → Retry`);
      console.error(`  → Option B: Use OpenAI API key directly:`);
      console.error(`       export OPENAI_API_KEY=sk-...`);
      console.error(`       export LLM_BASE_URL=https://api.openai.com/v1`);
      console.error(`       export LLM_MODEL=gpt-4o-mini`);
      console.error(`  → Option C: Run local Ollama:`);
      console.error(`       ollama serve`);
      console.error(`       export LLM_BASE_URL=http://localhost:11434/v1`);
      console.error(`       export LLM_MODEL=llama3.2`);
    } else if (err.status === 401) {
      console.error(`\n🔑 401 Unauthorized — Token is invalid or expired`);
    }
    
    console.error(`\nFull error object:`);
    console.error(JSON.stringify(err, null, 2));
    process.exit(1);
  }
}

testGitHubModels().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
