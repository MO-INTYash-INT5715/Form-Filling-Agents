'use client';

import React from 'react';

export default function PopupPage() {
  const [status, setStatus] = React.useState('Ready');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleFillForm = async () => {
    setIsLoading(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, { type: 'DETECT_FORM' });
        setStatus('Form filled successfully!');
      }
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="w-96 p-4 bg-gray-50">
      <div className="bg-white rounded-lg shadow p-4">
        <h1 className="text-lg font-semibold mb-3 text-gray-900">Form Filling Agent</h1>
        <div className="bg-gray-100 rounded p-2 mb-3 text-sm text-gray-600">
          {status}
        </div>
        <button
          onClick={handleFillForm}
          disabled={isLoading}
          className="w-full mb-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Filling...' : 'Fill This Form'}
        </button>
        <button
          onClick={handleSettings}
          className="w-full px-4 py-2 bg-gray-300 text-gray-900 rounded hover:bg-gray-400"
        >
          Settings
        </button>
      </div>
    </div>
  );
}
