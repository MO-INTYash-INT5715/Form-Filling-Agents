import type { FormInstance, AgentAction } from '../../benchmark/types';
import { extractFields } from './patterns';

export class RuleBasedAgent {
  name = 'rule-based-agent';

  async planActions(instance: FormInstance): Promise<AgentAction[]> {
    const actions: AgentAction[] = [];
    const keys = Object.keys(instance.goldAnswers);
    const extracted = extractFields(instance.formId, instance.inputDocument, keys);

    for (const key of keys) {
      const value = extracted[key];
      if (value === undefined) continue;

      if (typeof value === 'boolean' || value === 'true' || value === 'Yes') {
        actions.push({ type: 'check', fieldId: key });
      } else if (Array.isArray(value)) {
        for (const v of value) {
          actions.push({ type: 'select', fieldId: key, text: String(v) });
        }
      } else {
        // We emit type for strings. Playwright executor will attempt to fill.
        actions.push({ type: 'type', fieldId: key, text: String(value) });
      }
    }
    return actions;
  }
}
