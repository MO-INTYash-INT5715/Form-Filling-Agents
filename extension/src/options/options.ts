import { getStorageData, setStorageData } from '@/utils/storage';

document.addEventListener('DOMContentLoaded', initOptions);

function initOptions(): void {
  const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
  const providerSelect = document.getElementById('provider') as HTMLSelectElement;
  const saveButton = document.getElementById('save') as HTMLButtonElement;
  
  // Load saved settings
  loadSettings(apiKeyInput, providerSelect);
  
  // Save settings on button click
  saveButton?.addEventListener('click', async () => {
    const settings = {
      apiKey: apiKeyInput.value,
      provider: providerSelect.value,
      enabled: true,
    };
    
    await setStorageData('settings', settings);
    showMessage('Settings saved successfully!');
  });
}

async function loadSettings(
  apiKeyInput: HTMLInputElement,
  providerSelect: HTMLSelectElement
): Promise<void> {
  try {
    const settings = await getStorageData('settings', {
      provider: 'custom',
      apiKey: '',
    });
    
    if (settings) {
      apiKeyInput.value = settings.apiKey || '';
      providerSelect.value = settings.provider || 'custom';
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

function showMessage(message: string): void {
  const messageEl = document.createElement('div');
  messageEl.textContent = message;
  messageEl.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #4CAF50;
    color: white;
    padding: 10px 16px;
    border-radius: 4px;
    z-index: 10000;
  `;
  
  document.body.appendChild(messageEl);
  
  setTimeout(() => {
    messageEl.remove();
  }, 2000);
}
