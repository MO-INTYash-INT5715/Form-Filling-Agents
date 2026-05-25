document.addEventListener('DOMContentLoaded', initPopup);
function initPopup() {
  const fillButton = document.getElementById('fillForm');
  const settingsButton = document.getElementById('settings');
  const statusDiv = document.getElementById('status');

  fillButton === null || fillButton === void 0 ? void 0 : fillButton.addEventListener('click', async () => {
    try {
      statusDiv.textContent = 'Filling form...';
      const tabs = await new Promise((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, resolve));
      const tab = tabs && tabs[0];
      if (!tab || !tab.id) {
        statusDiv.textContent = 'Error: No active tab';
        return;
      }

      // Request form detection from content script
      await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tab.id, { type: 'DETECT_FORM' }, (response) => {
          if (chrome.runtime.lastError) {
            // If content script not injected yet, inform the user
            reject(chrome.runtime.lastError);
          }
          else {
            resolve(response);
          }
        });
      });
      statusDiv.textContent = 'Form detected, preparing to fill...';

      // Send fill request to background (which will forward to content script)
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: 'FILL_FORM', data: {} }, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          }
          else {
            resolve(response);
          }
        });
      });

      statusDiv.textContent = 'Form filled successfully!';
    }
    catch (error) {
      const msg = error && error.message ? error.message : String(error);
      statusDiv.textContent = `Error: ${msg}`;
    }
  });

  settingsButton === null || settingsButton === void 0 ? void 0 : settingsButton.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  updateStatus(statusDiv);
}
async function updateStatus(element) {
  try {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings;
      element.textContent = settings ? 'Ready' : 'Configure settings first';
    });
  }
  catch (_a) {
    element.textContent = 'Ready';
  }
}
