import { Page } from 'playwright';
import { BenchmarkAgent, FormInstance } from '../../benchmark/types';

/**
 * Vision-Based LLM Agent
 * 
 * Takes screenshots of the page and passes them to a multi-modal LLM
 * (e.g. GPT-4o or Claude 3.5 Sonnet) for coordinate prediction.
 */
export class VisionAgent implements BenchmarkAgent {
  name = 'vision-agent';

  constructor() {}

  async planActions(
    inputDocument: string,
    formStructure: any
  ): Promise<any[]> {
    throw new Error('VisionAgent requires iterative execution via runIterative()');
  }

  async runIterative(
    page: Page,
    instance: FormInstance,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log(`[Vision Agent] Starting iterative visual execution for ${instance.formName}`);
    
    // Example Loop:
    // 1. Take Screenshot
    // 2. Feed base64 image + inputDocument to LLM
    // 3. Receive actions (click at [x,y], type 'text')
    // 4. Execute via Playwright
    // 5. Repeat until form is submitted

    let turn = 0;
    let isComplete = false;
    
    // We import OpenAI dynamically just for the vision agent for now
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    while (turn < 10 && !isComplete) {
      turn++;
      
      // 1. Take a screenshot
      const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
      const base64Image = screenshot.toString('base64');
      
      console.log(`[Vision Agent] Turn ${turn}: Captured screenshot (${base64Image.length} bytes)`);
      
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a vision-based web automation agent. You must fill out the form based on the input document provided. Output JSON with { \"action\": \"click\"|\"type\"|\"submit\", \"coordinates\": [x, y], \"text\": \"...\" }."
            },
            {
              role: "user",
              content: [
                { type: "text", text: `Form: ${instance.formName}\nDocument Context: ${inputDocument}` },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 300,
        });

        const actionText = response.choices[0].message.content || '{}';
        const action = JSON.parse(actionText);
        
        console.log(`[Vision Agent] Action predicted:`, action);

        if (action.action === 'submit') {
          isComplete = true;
        } else if (action.action === 'click' && action.coordinates) {
          await page.mouse.click(action.coordinates[0], action.coordinates[1]);
        } else if (action.action === 'type' && action.coordinates && action.text) {
          await page.mouse.click(action.coordinates[0], action.coordinates[1]);
          await page.keyboard.type(action.text);
        }
      } catch (err) {
        console.error(`[Vision Agent] Turn ${turn} failed:`, err);
        break;
      }
    }
  }
}
