/**
 * browser-mcp — placeholder implementation.
 *
 * Throws NotImplemented. Exists so the shared runner can dynamic-import
 * the module without crashing, and so the type contract is locked in
 * before real code is written.
 */

import type { FillResult, MCPFormFiller, UserProfile } from "../../shared/types.js";

class BrowserMcpAgent implements MCPFormFiller {
  name = "browser-mcp";
  async init(): Promise<void> { /* TODO: connect to BrowserMCP bridge */ }
  async fill(url: string, _profile: UserProfile): Promise<FillResult> {
    const now = new Date().toISOString();
    return {
      implementation: this.name,
      formId: "",
      url,
      success: false,
      fieldsAttempted: 0,
      fieldsFilled: 0,
      fieldsExpected: 0,
      accuracy: 0,
      durationMs: 0,
      toolCalls: 0,
      tokensIn: 0,
      tokensOut: 0,
      error: "browser-mcp: not implemented",
      failureCategory: "other",
      startedAt: now,
      finishedAt: now,
    };
  }
  async close(): Promise<void> { /* noop */ }
}

export function createFiller(): MCPFormFiller {
  return new BrowserMcpAgent();
}
