import { detectForms } from '../utils/form-detection';
import { FormFiller } from '../utils/form-filler';
// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    handleMessage(request, sendResponse);
    return true; // Will respond asynchronously
});
async function handleMessage(message, sendResponse) {
    try {
        switch (message.type) {
            case 'DETECT_FORM':
                const forms = detectForms();
                sendResponse({ success: true, forms });
                break;
            case 'FILL_FORM':
                // Perform filling in the page context
                try {
                    const forms = detectForms();
                    const filler = new FormFiller();
                    if (forms.length === 0) {
                        sendResponse({ success: false, error: 'No forms detected' });
                        break;
                    }
                    // Fill first form by default with provided mapping
                    const mapping = message.data;
                    const result = filler.fillForm(forms[0].fields, mapping);
                    sendResponse({ success: true, result });
                }
                catch (err) {
                    sendResponse({ success: false, error: err.message });
                }
                break;
            case 'ANALYZE_FORM':
                const analyzedForms = detectForms();
                sendResponse({ success: true, forms: analyzedForms });
                break;
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
    const forms = detectForms();
    if (forms.length > 0) {
        chrome.runtime.sendMessage({
            type: 'FORMS_DETECTED',
            data: { count: forms.length },
        }).catch(() => {
            // Ignore errors if background script is not ready
        });
    }
});
//# sourceMappingURL=content-script.js.map