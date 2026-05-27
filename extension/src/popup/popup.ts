import { sendMessageToBackground, getStorageData } from '@/utils/storage';

document.addEventListener('DOMContentLoaded', initPopup);

function initPopup(): void {
  const fillButton = document.getElementById('fillForm') as HTMLButtonElement;
  const settingsButton = document.getElementById('settings') as HTMLButtonElement;
  const statusDiv = document.getElementById('status') as HTMLDivElement;
  
  fillButton?.addEventListener('click', async () => {
    try {
      statusDiv.textContent = 'Filling form...';
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        statusDiv.textContent = 'Error: No active tab';
        return;
      }
      
      // Request form detection
      await chrome.tabs.sendMessage(tab.id, { type: 'DETECT_FORM' });
      statusDiv.textContent = 'Form detected, preparing to fill...';
      
      // Send fill request
      await sendMessageToBackground({
        type: 'FILL_FORM',
        data: {},
      });
      
      statusDiv.textContent = 'Form filled successfully!';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      statusDiv.textContent = `Error: ${errorMessage}`;
    }
  });
  
  settingsButton?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Update status
  updateStatus(statusDiv);
}

async function updateStatus(element: HTMLDivElement): Promise<void> {
  try {
    const settings = await getStorageData('settings');
    element.textContent = settings ? 'Ready' : 'Configure settings first';
  } catch (error) {
    element.textContent = 'Ready';
  }
}
