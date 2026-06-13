import { FillResult, MCPFormFiller, UserProfile } from "../../../shared/types.js";
import { PlaywrightMcpClient } from "../client.js";

export class RuleBasedMcpAgent implements MCPFormFiller {
  name = "rule-based";
  private mcp = new PlaywrightMcpClient();

  async init(): Promise<void> { await this.mcp.start(); }
  
  async fill(url: string, profile: UserProfile): Promise<FillResult> {
    const started = new Date();
    // Simplified stub for ablation testing - a real rule-based agent would
    // call mcp.get_dom_snapshot, parse it locally, and call mcp.fill_field.
    return {
      implementation: this.name, formId: "", url, success: false,
      fieldsAttempted: 0, fieldsFilled: 0, fieldsExpected: 0, accuracy: 0,
      durationMs: Date.now() - started.getTime(), toolCalls: 0, tokensIn: 0, tokensOut: 0,
      startedAt: started.toISOString(), finishedAt: new Date().toISOString()
    };
  }

  async close(): Promise<void> { await this.mcp.close(); }
}

export function createFiller(): MCPFormFiller { return new RuleBasedMcpAgent(); }
