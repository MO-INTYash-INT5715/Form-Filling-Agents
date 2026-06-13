/**
 * The agent loop. Implements the MCPFormFiller contract from
 * ../shared/types.ts.
 *
 * Loop:
 *   1. Ask LLM what to do, given system prompt + last tool result(s).
 *   2. If LLM returns a tool call, execute it through PlaywrightMcpClient.
 *      Feed the (truncated) result back to the LLM.
 *   3. If LLM emits <<DONE>> or <<BLOCKED: ...>>, stop.
 *   4. If MAX_TURNS_PER_FORM exceeded, stop with failure.
 */

import "dotenv/config";
import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import {
  FillResult,
  MCPFormFiller,
  UserProfile,
} from "../../shared/types.js";
import { PlaywrightMcpClient } from "./client.js";
import { SYSTEM_PROMPT, buildUserPrompt, MAX_SNAPSHOT_CHARS } from "./prompt.js";

const MODEL = process.env.LLM_MODEL ?? "openai/gpt-4o-mini";
const MAX_TURNS = parseInt(process.env.MAX_TURNS_PER_FORM ?? "20", 10);

/**
 * Build an OpenAI-SDK client pointed at whichever OpenAI-compatible
 * endpoint the env asks for.
 *
 * Default: GitHub Models (https://models.github.ai/inference), authed
 *          with GITHUB_TOKEN — a PAT with "Models: read" scope.
 * Fallback: classic OpenAI (api.openai.com) if OPENAI_API_KEY is set.
 *
 * Same SDK, same chat-completions surface, same tool-use protocol — the
 * only thing that changes is baseURL + apiKey.
 */
function makeClient(): OpenAI {
  const provider = process.env.LLM_PROVIDER || "openai";
  let baseURL = process.env.LLM_BASE_URL ?? process.env.OPENAI_BASE_URL ?? "https://models.github.ai/inference";
  let apiKey =
    process.env.GITHUB_TOKEN ||
    process.env.LLM_API_KEY ||
    process.env.OPENAI_API_KEY;

  if (provider === "cerebras") {
    baseURL = "https://api.cerebras.ai/v1";
    apiKey = process.env.CEREBRAS_API_KEY || apiKey;
  }

  // For local Ollama, use a dummy key
  const isLocal = baseURL.includes('localhost') || baseURL.includes('127.0.0.1');
  const finalKey = apiKey || (isLocal ? 'ollama' : undefined);
  
  if (!finalKey) {
    throw new Error(
      "No API key found. Set GITHUB_TOKEN (recommended) or OPENAI_API_KEY in .env",
    );
  }
  return new OpenAI({ apiKey: finalKey, baseURL });
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n) + `\n…[truncated ${s.length - n} chars]`;
}

function classifyError(msg: string): FillResult["failureCategory"] {
  const m = msg.toLowerCase();
  if (m.includes("captcha")) return "captcha";
  if (m.includes("bot") || m.includes("forbidden") || m.includes("403")) return "bot-detection";
  if (m.includes("loop") || m.includes("max turns")) return "agentic-loop";
  if (m.includes("hallucin")) return "hallucination";
  return "other";
}

export class LlmStructuredMcpAgent implements MCPFormFiller {
  name = "llm-structured";
  private mcp = new PlaywrightMcpClient();
  private openai: OpenAI;
  private tools: ChatCompletionTool[] = [];

  constructor() {
    this.openai = makeClient();
  }

  async init(): Promise<void> {
    await this.mcp.start();
    const t = await this.mcp.listTools();
    this.tools = t.map((td) => ({
      type: "function",
      function: {
        name: td.name,
        description: td.description ?? "",
        parameters: (td.inputSchema as any) ?? { type: "object", properties: {} },
      },
    }));
  }

  async fill(url: string, profile: UserProfile): Promise<FillResult> {
    const started = new Date();
    let tokensIn = 0;
    let tokensOut = 0;
    let success = false;
    let blockedReason: string | null = null;
    let lastError: string | undefined;

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(JSON.stringify(profile, null, 2), url) },
    ];

    try {
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const resp = await this.openai.chat.completions.create({
          model: MODEL,
          messages,
          tools: this.tools,
          tool_choice: "auto",
          temperature: 0,
        });
        tokensIn += resp.usage?.prompt_tokens ?? 0;
        tokensOut += resp.usage?.completion_tokens ?? 0;

        const msg = resp.choices[0].message;
        messages.push(msg as any);

        const content = msg.content ?? "";
        if (content.includes("<<DONE>>")) { success = true; break; }
        const blocked = content.match(/<<BLOCKED:\s*(.+?)>>/);
        if (blocked) { blockedReason = blocked[1]; break; }

        if (!msg.tool_calls || msg.tool_calls.length === 0) {
          // LLM produced text without a tool call and didn't signal done.
          // Nudge it once, then break.
          messages.push({
            role: "user",
            content: "Continue. Use tools, or respond with <<DONE>> if finished.",
          });
          continue;
        }

        for (const tc of msg.tool_calls) {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(tc.function.arguments || "{}"); } catch { /* ignore */ }
          try {
            const r = await this.mcp.callTool(tc.function.name, args);
            const text = typeof r === "string"
              ? r
              : JSON.stringify(r?.content ?? r);
            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: truncate(text, MAX_SNAPSHOT_CHARS),
            });
          } catch (e: any) {
            lastError = String(e?.message ?? e);
            messages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: `ERROR: ${lastError}`,
            });
          }
        }
      }
    } catch (e: any) {
      lastError = String(e?.message ?? e);
    }

    const finished = new Date();
    const expected = 0; // Caller fills this in based on LiveForm.expectedFields if needed.
    return {
      implementation: this.name,
      formId: "",                 // populated by runner
      url,
      success,
      fieldsAttempted: this.mcp.toolCallCount,
      fieldsFilled: success ? this.mcp.toolCallCount : 0,
      fieldsExpected: expected,
      accuracy: 0,                // computed post-hoc against expectedFields
      durationMs: finished.getTime() - started.getTime(),
      toolCalls: this.mcp.toolCallCount,
      tokensIn,
      tokensOut,
      error: blockedReason ?? lastError,
      failureCategory: blockedReason
        ? "bot-detection"
        : lastError
          ? classifyError(lastError)
          : undefined,
      startedAt: started.toISOString(),
      finishedAt: finished.toISOString(),
    };
  }

  async close(): Promise<void> {
    await this.mcp.close();
  }
}

export function createFiller(): MCPFormFiller {
  return new LlmStructuredMcpAgent();
}
