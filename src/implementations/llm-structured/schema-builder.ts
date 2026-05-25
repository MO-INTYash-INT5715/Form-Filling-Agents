/**
 * Dynamically builds JSON Schema for LLM structured output mapping based on expected fields.
 */
export function buildJsonSchema(keys: string[], goldAnswers: Record<string, any>): any {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const key of keys) {
    const val = goldAnswers[key];
    if (typeof val === 'boolean') {
      properties[key] = {
        type: 'boolean',
        description: `Boolean choice for: ${key}`
      };
    } else if (Array.isArray(val)) {
      properties[key] = {
        type: 'array',
        items: { type: 'string' },
        description: `Selected option(s) for: ${key}`
      };
    } else {
      properties[key] = {
        type: 'string',
        description: `Value extracted from document for: ${key}`
      };
    }
    required.push(key);
  }

  return {
    type: 'object',
    properties,
    required,
    additionalProperties: false,
  };
}

/**
 * Returns a textual prompt representation of the expected JSON structure.
 * Useful for LLMs that do not support strict JSON schema API parameters.
 */
export function buildSchemaPrompt(keys: string[], goldAnswers: Record<string, any>): string {
  const example: Record<string, any> = {};
  for (const key of keys) {
    const val = goldAnswers[key];
    if (typeof val === 'boolean') {
      example[key] = true;
    } else if (Array.isArray(val)) {
      example[key] = ['Option A'];
    } else {
      example[key] = 'Extracted Text';
    }
  }
  return JSON.stringify(example, null, 2);
}
