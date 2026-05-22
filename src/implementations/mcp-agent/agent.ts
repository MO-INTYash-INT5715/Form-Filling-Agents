import type { Page } from 'playwright';
import type { FormInstance, BenchmarkAgent } from '../../benchmark/types';

/**
 * Generalized MCP Agent Template
 * 
 * This agent demonstrates how a BrowserMCP or PlaywrightMCP agent integrates
 * into the benchmark. Instead of planning all actions in advance, this agent
 * receives the live Playwright Page and iterates interactively (LLM -> Tool -> LLM).
 */
export class MCPAgent implements BenchmarkAgent {
  name = 'mcp-agent';

  async runIterative(instance: FormInstance, page: Page): Promise<void> {
    console.log(`[MCP Agent] Starting iterative execution for ${instance.formName}`);
    
    // In a real implementation, you would:
    // 1. Initialize your LLM client (e.g. Anthropic, Google GenAI)
    // 2. Wrap the `page` methods (page.fill, page.click) into MCP Tools
    // 3. Start a conversation loop, passing `instance.inputDocument` as the task
    // 4. Let the LLM loop until it calls a "submit_form" or "finished" tool
    
    // For this boilerplate, we'll just demonstrate it has access to the page
    // and can read the DOM natively.
    const title = await page.title();
    console.log(`[MCP Agent] Current page title: ${title}`);
    console.log(`[MCP Agent] Document to process: ${instance.inputDocument.substring(0, 50)}...`);
    
    // Mocking an LLM filling out a field interactively
    // await page.fill('input[type="text"]', 'Sample data');
    
    console.log(`[MCP Agent] Finished iteration.`);
  }
}
