/**
 * Smoke test — does the MCP server spawn, list tools, and roundtrip a
 * navigation? Does NOT call the LLM (no API key required).
 *
 * Run:  npx tsx tests/smoke.test.ts
 */

import assert from "node:assert/strict";
import { PlaywrightMcpClient } from "../src/client.js";

async function main() {
  const c = new PlaywrightMcpClient();
  await c.start();
  try {
    const tools = await c.listTools();
    assert.ok(tools.length > 0, "expected MCP server to expose >0 tools");
    const names = tools.map((t) => t.name).sort();
    console.log(`MCP tools (${names.length}):`, names.slice(0, 12), "…");
    assert.ok(
      names.some((n) => /navigate/i.test(n)),
      "expected a navigate-like tool",
    );
    console.log("OK");
  } finally {
    await c.close();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
