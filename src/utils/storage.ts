export async function getStorageData<T>(key: string, defaultValue?: T): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] ?? defaultValue);
    });
  });
}

export async function setStorageData<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

export async function removeStorageData(key: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove([key], resolve);
  });
}

export function sendMessageToBackground<T = unknown>(
  message: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

export function sendMessageToContentScript<T = unknown>(
  tabId: number,
  message: unknown
): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}
