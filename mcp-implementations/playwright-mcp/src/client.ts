/**
 * Thin wrapper around the @playwright/mcp server, spoken via the
 * @modelcontextprotocol/sdk stdio transport.
 *
 * Exposes:
 *   - listTools()
 *   - callTool(name, args)
 *   - close()
 *
 * Counts every tool call so the agent can report it back in FillResult.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export class PlaywrightMcpClient {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  public toolCallCount = 0;

  async start(): Promise<void> {
    // The @playwright/mcp package exposes a CLI entry point.
    // We spawn it via npx so it works without a manual global install.
    // Channel defaults to "chrome" so we use the user's installed Chrome
    // and skip Playwright's bundled Chromium (often broken behind corp
    // proxies / certs). Override via env MCP_BROWSER_CHANNEL.
    const channel = process.env.MCP_BROWSER_CHANNEL || "chrome";
    const headless = (process.env.MCP_HEADLESS ?? "true").toLowerCase() !== "false";
    const args = ["-y", "@playwright/mcp@latest", "--browser", channel];
    if (headless) args.push("--headless");
    this.transport = new StdioClientTransport({
      command: process.platform === "win32" ? "npx.cmd" : "npx",
      args,
    });
    this.client = new Client(
      { name: "ffa-playwright-mcp", version: "0.1.0" },
      { capabilities: {} },
    );
    await this.client.connect(this.transport);
  }

  async listTools(): Promise<Array<{ name: string; description?: string; inputSchema?: any }>> {
    if (!this.client) throw new Error("client not started");
    const r = await this.client.listTools();
    return r.tools as any;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    if (!this.client) throw new Error("client not started");
    this.toolCallCount++;
    const r = await this.client.callTool({ name, arguments: args });
    return r;
  }

  async close(): Promise<void> {
    try { await this.client?.close(); } catch { /* noop */ }
    try { await this.transport?.close(); } catch { /* noop */ }
  }
}
