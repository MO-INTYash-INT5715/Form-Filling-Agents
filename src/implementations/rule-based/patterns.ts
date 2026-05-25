import { formExtractors } from './generated-extractors';

export function extractFields(formId: string, text: string, _keys: string[]): Record<string, any> {
  const extractor = formExtractors[formId];
  if (extractor) {
    return extractor(text);
  }
  return {};
}
