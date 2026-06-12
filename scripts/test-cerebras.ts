/**
 * Quick smoke-test for Cerebras inference.
 * Usage: npx ts-node -e "" scripts/test-cerebras.ts
 *        or: npx tsx scripts/test-cerebras.ts
 */
import * as dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const MODEL = 'gpt-oss-120b';
const BASE_URL = 'https://api.cerebras.ai/v1';

async function main() {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    console.error('❌ CEREBRAS_API_KEY not set in .env');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey, baseURL: BASE_URL });

  // ── Test 1: Simple chat completion ──────────────────────────────────────
  console.log(`\n🔵 Test 1 — Basic chat (model: ${MODEL})`);
  const t0 = Date.now();
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: 'You are a concise assistant.' },
      { role: 'user', content: 'What is 42 * 17? Reply with just the number.' },
    ],
    temperature: 0,
  });
  const elapsed = Date.now() - t0;
  const answer = res.choices[0]?.message?.content?.trim();
  console.log(`   Answer : ${answer}`);
  console.log(`   Tokens : in=${res.usage?.prompt_tokens}  out=${res.usage?.completion_tokens}`);
  console.log(`   Time   : ${elapsed}ms`);
  const pass1 = answer === '714';
  console.log(`   ${pass1 ? '✅ PASS' : `⚠️  WARN (expected 714, got ${answer})`}`);

  // ── Test 2: JSON output (form-filling style prompt) ─────────────────────
  console.log('\n🔵 Test 2 — JSON form-filling output');
  const t1 = Date.now();
  const res2 = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a form-filling assistant. Respond ONLY with a valid JSON object. No extra text.',
      },
      {
        role: 'user',
        content: `Input document:
---
Name: Alice Johnson
Date of Birth: March 15, 1990
Email: alice@example.com
---

Fill these fields and return JSON:
{ "full_name": "...", "dob": "YYYY-MM-DD", "email": "..." }`,
      },
    ],
    temperature: 0,
  });
  const elapsed2 = Date.now() - t1;
  const raw2 = res2.choices[0]?.message?.content?.trim() ?? '';
  console.log(`   Raw response: ${raw2}`);
  console.log(`   Tokens : in=${res2.usage?.prompt_tokens}  out=${res2.usage?.completion_tokens}`);
  console.log(`   Time   : ${elapsed2}ms`);
  try {
    const parsed = JSON.parse(raw2.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
    const pass2 =
      parsed.full_name === 'Alice Johnson' &&
      parsed.dob === '1990-03-15' &&
      parsed.email === 'alice@example.com';
    console.log(`   Parsed : ${JSON.stringify(parsed)}`);
    console.log(`   ${pass2 ? '✅ PASS' : '⚠️  WARN — values may differ'}`);
  } catch {
    console.log('   ❌ FAIL — could not parse JSON');
  }

  console.log('\n✅ Cerebras smoke-test complete.\n');
}

main().catch((err) => {
  console.error('❌ Error:', err?.message ?? err);
  process.exit(1);
});
