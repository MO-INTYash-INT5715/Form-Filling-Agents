export async function getStorageData(key, defaultValue) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            resolve(result[key] ?? defaultValue);
        });
    });
}
export async function setStorageData(key, value) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
    });
}
export async function removeStorageData(key) {
    return new Promise((resolve) => {
        chrome.storage.local.remove([key], resolve);
    });
}
export function sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            }
            else {
                resolve(response);
            }
        });
    });
}
export function sendMessageToContentScript(tabId, message) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            }
            else {
                resolve(response);
            }
        });
    });
}
//# sourceMappingURL=storage.js.map