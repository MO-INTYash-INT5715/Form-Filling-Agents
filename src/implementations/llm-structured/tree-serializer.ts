/**
 * Serializes form keys and types to a compact, readable text format for LLM prompts.
 */
export function serializeFormFields(keys: string[], goldAnswers: Record<string, any>): string {
  return keys
    .map(key => {
      const val = goldAnswers[key];
      let typeStr = 'String';
      if (typeof val === 'boolean') {
        typeStr = 'Checkbox/Boolean';
      } else if (Array.isArray(val)) {
        typeStr = 'Multiple Selection / Array';
      }
      return `- Field Name/Label: "${key}" (Expected Type: ${typeStr})`;
    })
    .join('\n');
}
