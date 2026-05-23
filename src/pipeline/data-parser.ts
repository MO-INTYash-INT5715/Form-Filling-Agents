/**
 * Input Pipeline: Data Parser
 * 
 * Responsible for converting unstructured text (e.g. resumes, emails) into
 * a normalized, structured JSON payload using an LLM.
 * This decouples extraction logic from DOM interaction logic.
 */

import { getLLMClient, getLLMModel } from '../utils/llm';

export interface ParsedData {
  fields: Record<string, string | boolean | string[]>;
}

export class DataParser {
  private client;
  private model: string;

  constructor() {
    this.client = getLLMClient();
    this.model = getLLMModel();
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
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: 'json_object' } // Some local LLMs might ignore this, but it helps OpenAI
      });

      const content = response.choices[0]?.message?.content || '{}';
      
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
