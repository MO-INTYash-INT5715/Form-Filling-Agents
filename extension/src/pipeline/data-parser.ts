/**
 * Input Pipeline: Data Parser
 * 
 * Responsible for converting unstructured text (e.g. resumes, emails) into
 * a normalized, structured JSON payload using an LLM.
 * This decouples extraction logic from DOM interaction logic.
 */

import { getLLMClient, getLLMModel, getLLMProvider } from '../utils/llm';

export interface ParsedData {
  fields: Record<string, string | boolean | string[]>;
}

export class DataParser {
  private client;
  private model: string;
  private provider: string;

  constructor() {
    this.client = getLLMClient();
    this.model = getLLMModel();
    this.provider = getLLMProvider();
  }

  async parse(inputDocument: string, expectedKeys: string[]): Promise<ParsedData> {
    console.log(`[DataParser] Extracting ${expectedKeys.length} keys from document...`);
    
    const prompt = `
      You are a highly accurate data extraction system.
      Extract the following fields from the provided document:
      Keys: ${JSON.stringify(expectedKeys)}

      Document:
      ---
      ${inputDocument}
      ---
      
      Respond ONLY with valid JSON in a flat key-value map. Do not include markdown code blocks.
    `;

    try {
      let content = '{}';

      if (this.provider === 'gemini') {
        const model = this.client.getGenerativeModel({ model: this.model });
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0,
            responseMimeType: 'application/json'
          }
        });
        content = result.response.text() || '{}';
      } else if (this.provider === 'bedrock') {
        const { ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
        const command = new ConverseCommand({
          modelId: this.model,
          messages: [{ role: 'user', content: [{ text: prompt }] }],
          inferenceConfig: {
            temperature: 0
          }
        });
        const response = await this.client.send(command);
        content = response.output?.message?.content?.[0]?.text || '{}';
      } else {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0,
          response_format: { type: 'json_object' } // Some local LLMs might ignore this, but it helps OpenAI
        });
        content = response.choices[0]?.message?.content || '{}';
      }
      
      // Attempt to parse. If it included markdown blocks, strip them.
      const cleaned = content.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      const parsed = JSON.parse(cleaned);

      return { fields: parsed };
    } catch (err) {
      console.error(`[DataParser] LLM extraction failed: ${(err as Error).message}`);
      return { fields: {} };
    }
  }
}
