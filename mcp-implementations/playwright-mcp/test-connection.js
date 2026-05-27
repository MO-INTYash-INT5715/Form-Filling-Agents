#!/usr/bin/env node
import "dotenv/config";
import OpenAI from "openai";

const baseURL = process.env.LLM_BASE_URL ?? "https://models.github.ai/inference";
const apiKey = process.env.GITHUB_TOKEN || process.env.OPENAI_API_KEY;
const model = process.env.LLM_MODEL ?? "openai/gpt-4o-mini";

console.log("Testing connection to:", baseURL);
console.log("Using model:", model);
console.log("API key present:", !!apiKey);

if (!apiKey) {
  console.error("ERROR: No API key found in .env");
  process.exit(1);
}

const client = new OpenAI({ apiKey, baseURL });

try {
  const resp = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: "Hello" }],
    max_tokens: 10,
  });
  console.log("\n✓ Connection successful!");
  console.log("Response:", resp.choices[0].message.content);
} catch (err) {
  console.error("\n✗ Connection failed:", err.message);
  if (err.code) console.error("Error code:", err.code);
  process.exit(1);
}
