import { sendMessageToContentScript, getStorageData, setStorageData } from '../utils/storage';
// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true; // Will respond asynchronously
});
async function handleMessage(message, sender, sendResponse) {
    try {
        switch (message.type) {
            case 'FORMS_DETECTED':
                console.log('Forms detected:', message.data);
                sendResponse({ success: true });
                break;
            case 'FILL_FORM':
                // Resolve tab ID from message or sender
                const tabId = message.tabId ?? sender.tab?.id;
                if (!tabId) {
                    sendResponse({ success: false, error: 'No tab ID' });
                    break;
                }
                // Forward fill request to content script running in the tab
                await sendMessageToContentScript(tabId, {
                    type: 'FILL_FORM',
                    data: message.data,
                });
                sendResponse({ success: true });
                break;
            case 'GET_SETTINGS':
                const settings = await getStorageData('settings', {
                    provider: 'custom',
                    enabled: true,
                });
                sendResponse({ success: true, settings });
                break;
            case 'SAVE_SETTINGS':
                await setStorageData('settings', message.data);
                sendResponse({ success: true });
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
// Background delegates actual filling to content scripts; keep a helper for detection if needed.
// Initialize extension on install/update
chrome.runtime.onInstalled.addListener(() => {
    console.log('Form Filling Agent extension installed');
});
//# sourceMappingURL=service-worker.js.map