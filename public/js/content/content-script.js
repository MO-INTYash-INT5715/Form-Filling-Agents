// Inlined utilities (form detection + form filler) to avoid dynamic imports and CSP issues
function extractFormFields(formElement) {
    const fields = [];
    const inputs = formElement.querySelectorAll('input, textarea, select');
    inputs.forEach(element => {
        const isInput = typeof HTMLInputElement !== 'undefined'
            ? element instanceof HTMLInputElement
            : !!(element && element.nodeName && element.nodeName.toLowerCase() === 'input');
        if (isInput && (element.type === 'hidden' || element.type === 'submit')) {
            return;
        }
        const label = findLabel(element);
        fields.push({
            element,
            type: isInput ? element.type : element.tagName.toLowerCase(),
            name: element.name,
            id: element.id,
            label: label === null || label === void 0 ? void 0 : label.textContent?.trim(),
            placeholder: element.getAttribute('placeholder') || undefined,
            value: element.value,
        });
    });
    return fields;
}
function findLabel(element) {
    if (element.id) {
        const label = document.querySelector(`label[for="${element.id}"]`);
        if (label)
            return label;
    }
    let parent = element.parentElement;
    while (parent) {
        if (parent.tagName === 'LABEL') {
            return parent;
        }
        parent = parent.parentElement;
    }
    return null;
}
function detectForms() {
    const forms = Array.from(document.querySelectorAll('form'));
    return forms.map(formElement => ({
        url: window.location.href,
        title: document.title,
        fields: extractFormFields(formElement),
        formElement,
    }));
}
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
class FormFiller {
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
// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    handleMessage(request, sendResponse);
    return true; // Will respond asynchronously
});
async function handleMessage(message, sendResponse) {
    try {
        switch (message.type) {
            case 'DETECT_FORM': {
                try {
                    const forms = detectForms();
                    sendResponse({ success: true, forms });
                }
                catch (e) {
                    sendResponse({ success: false, error: String(e) });
                }
                break;
            }
            case 'FILL_FORM': {
                try {
                    const forms = detectForms();
                    const filler = new FormFiller();
                    if (forms.length === 0) {
                        sendResponse({ success: false, error: 'No forms detected' });
                        break;
                    }
                    const mapping = message.data || {};
                    const result = filler.fillForm(forms[0].fields, mapping);
                    sendResponse({ success: true, result });
                }
                catch (err) {
                    sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
                }
                break;
            }
            case 'ANALYZE_FORM': {
                try {
                    const analyzedForms = detectForms();
                    sendResponse({ success: true, forms: analyzedForms });
                }
                catch (e) {
                    sendResponse({ success: false, error: String(e) });
                }
                break;
            }
            default:
                sendResponse({ success: false, error: 'Unknown message type' });
        }
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        sendResponse({ success: false, error: errorMessage });
    }
}
// Auto-detect forms on page load
window.addEventListener('load', () => {
    (async () => {
        try {
            const mod = await import(chrome.runtime.getURL('js/utils/form-detection.js'));
            const forms = mod.detectForms();
            if (forms.length > 0) {
                chrome.runtime.sendMessage({
                    type: 'FORMS_DETECTED',
                    data: { count: forms.length },
                });
            }
        }
        catch (e) {
            // Ignore errors if background script is not ready or import fails
        }
    })();
});
//# sourceMappingURL=content-script.js.map