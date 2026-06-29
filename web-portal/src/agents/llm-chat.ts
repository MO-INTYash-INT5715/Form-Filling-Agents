import { FlatProfile } from './types';

export interface ChatAction {
  fieldId: string;
  value: string;
}

export interface ChatResponse {
  message: string;
  actions: ChatAction[];
}

export async function chatWithLLM(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  fields: Array<{ fieldId: string; value: string; type: string; label?: string }>,
  profile: FlatProfile
): Promise<ChatResponse> {
  const provider = process.env.LLM_PROVIDER || 'openai';
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  const systemPrompt = `You are an AI assistant helping a user fill out a web form.
You have control over the active browser session and can update form fields.
You are given:
1. The user's query/clarification.
2. The current list of fields on the form and their filled values.
3. The user's profile information.

Your task:
- Answer the user's questions or address their request.
- If the user asks to change or fill a field (e.g. "change first name to Bob", "fill in my graduation year as 2023", "use bob@gmail.com as email"), provide the actions to execute on the browser.
- ONLY suggest actions for fields that actually exist in the current form.
- You must respond ONLY with a JSON object in this format:
{
  "message": "A friendly message explaining what you did, or answering their question.",
  "actions": [
    { "fieldId": "id_of_the_field", "value": "new_value_to_fill" }
  ]
}`;

  const fieldsSummary = fields
    .map(f => `- ID: "${f.fieldId}", Label: "${f.label || ''}", Type: "${f.type}", Current Value: "${f.value || ''}"`)
    .join('\n');

  const profileSummary = Object.entries(profile)
    .filter(([k]) => !k.includes('['))
    .slice(0, 80)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  const userContent = `FORM FIELDS:
${fieldsSummary}

USER PROFILE DATA:
${profileSummary}

NEW USER MESSAGE:
"${message}"

Return the JSON object.`;

  const messages: any[] = [];
  // Add system prompt
  if (provider !== 'bedrock') {
    messages.push({ role: 'system', content: systemPrompt });
  }

  // Add conversation history
  for (const h of history) {
    messages.push({ role: h.role, content: h.content });
  }

  // Add current user prompt
  messages.push({ role: 'user', content: userContent });

  let rawContent = '';

  try {
    if (provider === 'bedrock') {
      const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
      const config: any = {
        region: process.env.AWS_REGION || 'ap-south-1',
      };
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
        if (process.env.AWS_SESSION_TOKEN) {
          config.credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
        }
      }
      const client = new BedrockRuntimeClient(config);
      const command = new ConverseCommand({
        modelId: model,
        messages: [
          { role: 'user', content: [{ text: systemPrompt + '\n\n' + userContent }] }
        ],
        inferenceConfig: {
          temperature: 0.1,
          maxTokens: 2048,
        }
      });
      const response = await client.send(command);
      rawContent = response.output?.message?.content?.[0]?.text ?? '{}';
    } else {
      const { OpenAI } = await import('openai');
      let finalApiKey = apiKey;
      let finalBaseUrl = process.env.OPENAI_BASE_URL;

      if (provider === 'cerebras') {
        finalApiKey = process.env.CEREBRAS_API_KEY || apiKey;
        finalBaseUrl = 'https://api.cerebras.ai/v1';
      }

      const client = new OpenAI({
        apiKey: finalApiKey,
        ...(finalBaseUrl ? { baseURL: finalBaseUrl } : {}),
      });

      const response = await client.chat.completions.create({
        model,
        response_format: { type: 'json_object' },
        messages,
        temperature: 0.1,
        max_tokens: 1024,
      });

      rawContent = response.choices[0]?.message?.content ?? '{}';
    }
  } catch (err) {
    console.error('[LLM Chat Helper] LLM call failed:', err);
    return {
      message: `I encountered an error communicating with the reasoning LLM: ${err instanceof Error ? err.message : String(err)}`,
      actions: [],
    };
  }

  try {
    // Attempt to extract JSON (in case Qwen outputs some markdown code blocks)
    let jsonString = rawContent;
    if (jsonString.includes('```json')) {
      const match = jsonString.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonString = match[1];
      }
    } else if (jsonString.includes('```')) {
      const match = jsonString.match(/```\s*([\s\S]*?)\s*```/);
      if (match) {
        jsonString = match[1];
      }
    }
    const responseObj = JSON.parse(jsonString.trim()) as ChatResponse;
    return {
      message: responseObj.message || 'I have updated the fields as requested.',
      actions: responseObj.actions || [],
    };
  } catch (err) {
    console.error('[LLM Chat Helper] Failed to parse JSON response:', rawContent, err);
    return {
      message: rawContent || 'I completed your request but could not parse the response structure.',
      actions: [],
    };
  }
}
