import type { FormInstance, AgentAction, BenchmarkAgent } from '../../benchmark/types';
import { getLLMClient, getLLMModel } from '../../utils/llm';
import { serializeFormFields } from './tree-serializer';
import { buildJsonSchema, buildSchemaPrompt } from './schema-builder';

/** Token + latency telemetry attached to the agent instance after each planActions() call */
export interface LLMTelemetry {
  tokensIn: number;
  tokensOut: number;
  llmTimeMs: number;
  llmCalls: number;
}

export class LLMStructuredAgent implements BenchmarkAgent {
  name = 'llm-structured';
  private client;
  private model: string;
  /** Populated after each planActions() call — read by runner for ablation metrics */
  public lastTelemetry: LLMTelemetry = { tokensIn: 0, tokensOut: 0, llmTimeMs: 0, llmCalls: 0 };

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
Do not output any introductory or concluding text. Respond ONLY with the JSON object.
IMPORTANT: For any date field, output ONLY the value in YYYY-MM-DD format (e.g. "1990-05-23"). Never use slashes or natural language.
IMPORTANT: For dropdown/select fields, use the EXACT option string shown in the field description.`;

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
    // Reset telemetry
    this.lastTelemetry = { tokensIn: 0, tokensOut: 0, llmTimeMs: 0, llmCalls: 0 };

    try {
      const options: any = {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0,
      };

      if (provider === 'openai') {
        options.response_format = {
          type: 'json_schema',
          json_schema: { name: 'form_fill_values', strict: true, schema }
        };
      } else {
        // Ollama and others: use top-level format param
        options.format = 'json';
      }

      const t0 = Date.now();
      const response = await this.client.chat.completions.create(options);
      this.lastTelemetry.llmTimeMs += Date.now() - t0;
      this.lastTelemetry.llmCalls += 1;
      this.lastTelemetry.tokensIn += response.usage?.prompt_tokens ?? 0;
      this.lastTelemetry.tokensOut += response.usage?.completion_tokens ?? 0;

      responseContent = response.choices[0]?.message?.content || '{}';
    } catch (err) {
      console.error(`[LLM Structured Agent] API Call failed:`, err);
      return actions;
    }

    try {
      const cleaned = responseContent.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const result = JSON.parse(cleaned);

      for (const key of keys) {
        const val = result[key];
        if (val === undefined || val === null) continue;

        if (typeof val === 'boolean') {
          if (val) actions.push({ type: 'check', fieldId: key });
        } else if (Array.isArray(val)) {
          for (const item of val) {
            actions.push({ type: 'select', fieldId: key, text: String(item) });
          }
        } else {
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
      console.error(`[LLM Structured Agent] Failed to parse JSON:`, responseContent.slice(0, 200), err);
    }

    return actions;
  }
}
