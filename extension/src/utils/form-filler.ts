import type { FormField, FillingResult } from '../types/index';

function isInputElement(el: unknown): el is { value?: any; nodeName?: string; type?: string } {
  return (
    typeof HTMLInputElement !== 'undefined'
      ? el instanceof (HTMLInputElement as any)
      : !!(el && (el as any).nodeName && (el as any).nodeName.toLowerCase() === 'input')
  );
}

function isTextAreaElement(el: unknown): el is { value?: any; nodeName?: string } {
  return (
    typeof HTMLTextAreaElement !== 'undefined'
      ? el instanceof (HTMLTextAreaElement as any)
      : !!(el && (el as any).nodeName && (el as any).nodeName.toLowerCase() === 'textarea')
  );
}

function isSelectElement(el: unknown): el is { options?: any[]; nodeName?: string } {
  return (
    typeof HTMLSelectElement !== 'undefined'
      ? el instanceof (HTMLSelectElement as any)
      : !!(el && (el as any).nodeName && (el as any).nodeName.toLowerCase() === 'select')
  );
}

export class FormFiller {
  fillForm(fields: FormField[], data: Record<string, string>): FillingResult {
    let fieldsModified = 0;

    for (const field of fields) {
      const key = [field.name, field.id, field.label?.toLowerCase()]
        .filter(Boolean)
        .find(k => data[k as string]);

      if (!key) continue;

      const value = data[key];

      const el = field.element as any;

      if (isInputElement(el)) {
        try {
          (el as any).value = value;
          (el as any).dispatchEvent?.(new Event('input', { bubbles: true }));
          (el as any).dispatchEvent?.(new Event('change', { bubbles: true }));
          fieldsModified++;
          continue;
        } catch {
          // ignore DOM exceptions in non-browser environments
        }
      }

      if (isTextAreaElement(el)) {
        try {
          (el as any).value = value;
          (el as any).dispatchEvent?.(new Event('input', { bubbles: true }));
          (el as any).dispatchEvent?.(new Event('change', { bubbles: true }));
          fieldsModified++;
          continue;
        } catch {}
      }

      if (isSelectElement(el)) {
        try {
          const option = Array.from((el as any).options || []).find(
            (opt: any) => opt.value === value || opt.textContent === value
          );
          if (option) {
            (el as any).value = (option as any).value;
            (el as any).dispatchEvent?.(new Event('change', { bubbles: true }));
            fieldsModified++;
            continue;
          }
        } catch {}
      }
    }

    return {
      success: fieldsModified > 0,
      fieldsModified,
      message: `Successfully filled ${fieldsModified} field(s)`,
      timestamp: Date.now(),
    };
  }
}
