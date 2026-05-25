function isInputElement(el) {
    return (typeof HTMLInputElement !== 'undefined'
        ? el instanceof HTMLInputElement
        : !!(el && el.nodeName && el.nodeName.toLowerCase() === 'input'));
}
function isTextAreaElement(el) {
    return (typeof HTMLTextAreaElement !== 'undefined'
        ? el instanceof HTMLTextAreaElement
        : !!(el && el.nodeName && el.nodeName.toLowerCase() === 'textarea'));
}
function isSelectElement(el) {
    return (typeof HTMLSelectElement !== 'undefined'
        ? el instanceof HTMLSelectElement
        : !!(el && el.nodeName && el.nodeName.toLowerCase() === 'select'));
}
export class FormFiller {
    fillForm(fields, data) {
        let fieldsModified = 0;
        for (const field of fields) {
            const key = [field.name, field.id, field.label?.toLowerCase()]
                .filter(Boolean)
                .find(k => data[k]);
            if (!key)
                continue;
            const value = data[key];
            const el = field.element;
            if (isInputElement(el)) {
                try {
                    el.value = value;
                    el.dispatchEvent?.(new Event('input', { bubbles: true }));
                    el.dispatchEvent?.(new Event('change', { bubbles: true }));
                    fieldsModified++;
                    continue;
                }
                catch {
                    // ignore DOM exceptions in non-browser environments
                }
            }
            if (isTextAreaElement(el)) {
                try {
                    el.value = value;
                    el.dispatchEvent?.(new Event('input', { bubbles: true }));
                    el.dispatchEvent?.(new Event('change', { bubbles: true }));
                    fieldsModified++;
                    continue;
                }
                catch { }
            }
            if (isSelectElement(el)) {
                try {
                    const option = Array.from(el.options || []).find((opt) => opt.value === value || opt.textContent === value);
                    if (option) {
                        el.value = option.value;
                        el.dispatchEvent?.(new Event('change', { bubbles: true }));
                        fieldsModified++;
                        continue;
                    }
                }
                catch { }
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
//# sourceMappingURL=form-filler.js.map