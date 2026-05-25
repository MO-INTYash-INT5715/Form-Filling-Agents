import type { FormInstance, AgentAction, BenchmarkAgent } from '../../benchmark/types';
import { getLLMClient, getLLMModel } from '../../utils/llm';
import { serializeFormFields } from './tree-serializer';
import { buildJsonSchema, buildSchemaPrompt } from './schema-builder';

export class LLMStructuredAgent implements BenchmarkAgent {
  name = 'llm-structured';
  private client;
  private model: string;

  constructor() {
    this.client = getLLMClient();
    this.model = getLLMModel();
  }

  async planActions(instance: FormInstance): Promise<AgentAction[]> {
    const actions: AgentAction[] = [];
    const keys = Object.keys(instance.goldAnswers || {});
    if (keys.length === 0) return actions;

    const serializedFields = serializeFormFields(keys, instance.goldAnswers);
    const schema = buildJsonSchema(keys, instance.goldAnswers);
    const schemaPrompt = buildSchemaPrompt(keys, instance.goldAnswers);

    const provider = process.env.LLM_PROVIDER || 'ollama';

    const systemPrompt = `You are a structured form-filling assistant.
Your task is to extract values from the provided input document to fill out the form fields.
You MUST respond with a single, valid JSON object mapping the field labels directly to their extracted values.
Do not output any introductory or concluding text. Respond ONLY with the JSON object.`;

    const userPrompt = `Input Document:
---
${instance.inputDocument}
---

Form Fields:
${serializedFields}

You must return a JSON object with keys matching the form field names exactly.
Expected JSON Structure:
\`\`\`json
${schemaPrompt}
\`\`\`
`;

    let responseContent = '';
    try {
      const options: any = {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0,
      };

      // If we are using OpenAI, we can leverage structured outputs
      if (provider === 'openai') {
        options.response_format = {
          type: 'json_schema',
          json_schema: {
            name: 'form_fill_values',
            strict: true,
            schema: schema
          }
        };
      } else if (provider === 'ollama') {
        // Ollama supports json format parameter
        options.format = 'json';
      }

      const response = await this.client.chat.completions.create(options);
      responseContent = response.choices[0]?.message?.content || '{}';
    } catch (err) {
      console.error(`[LLM Structured Agent] API Call failed:`, err);
      return actions; // Return empty actions as fallback
    }

    try {
      const cleaned = responseContent.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const result = JSON.parse(cleaned);

      for (const key of keys) {
        const val = result[key];
        if (val === undefined || val === null) continue;

        if (typeof val === 'boolean') {
          if (val) {
            actions.push({ type: 'check', fieldId: key });
          }
        } else if (Array.isArray(val)) {
          for (const item of val) {
            actions.push({ type: 'select', fieldId: key, text: String(item) });
          }
        } else {
          // If the gold answer expects a boolean/array, let's normalize
          const expected = instance.goldAnswers[key];
          if (typeof expected === 'boolean') {
            const lowerVal = String(val).toLowerCase();
            if (lowerVal === 'true' || lowerVal === 'yes' || lowerVal === '1' || lowerVal === 'checked') {
              actions.push({ type: 'check', fieldId: key });
            }
          } else if (Array.isArray(expected)) {
            actions.push({ type: 'select', fieldId: key, text: String(val) });
          } else {
            actions.push({ type: 'type', fieldId: key, text: String(val) });
          }
        }
      }
    } catch (err) {
      console.error(`[LLM Structured Agent] Failed to parse JSON content:`, responseContent, err);
    }

    return actions;
  }
}
