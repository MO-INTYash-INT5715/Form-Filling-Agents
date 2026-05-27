/**
 * CLI entry point.
 *   npx tsx src/index.ts fill --url <url> --profile <profile.json>
 *
 * Also re-exports createFiller() so the shared runner.ts can import this
 * folder via dynamic import.
 */

import fs from "node:fs";
import { createFiller } from "./agent.js";
export { createFiller } from "./agent.js";

interface CliArgs { url: string; profile: string; }

function parseArgs(argv: string[]): CliArgs {
  const out: any = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--url") out.url = argv[++i];
    else if (argv[i] === "--profile") out.profile = argv[++i];
  }
  if (!out.url || !out.profile) {
    console.error("usage: fill --url <url> --profile <profile.json>");
    process.exit(2);
  }
  return out;
}

async function main() {
  const cmd = process.argv[2];
  if (cmd !== "fill") {
    console.error("usage: <fill> --url <url> --profile <profile.json>");
    process.exit(2);
  }
  const args = parseArgs(process.argv.slice(3));
  const profile = JSON.parse(fs.readFileSync(args.profile, "utf8"));
  const agent = createFiller();
  await agent.init();
  try {
    const result = await agent.fill(args.url, profile);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await agent.close();
  }
}

// Only run main() when invoked directly, not when imported by runner.ts.
const isMain = process.argv[1] && process.argv[1].endsWith("index.ts");
if (isMain) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
