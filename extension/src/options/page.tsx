'use client';

import React from 'react';

export default function OptionsPage() {
  const [apiKey, setApiKey] = React.useState('');
  const [provider, setProvider] = React.useState('custom');
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await chrome.storage.local.get(['settings']);
      if (result.settings) {
        setApiKey(result.settings.apiKey || '');
        setProvider(result.settings.provider || 'custom');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    const settings = { apiKey, provider, enabled: true };
    await chrome.storage.local.set({ settings });
    setMessage('Settings saved successfully!');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">Settings</h1>

        <div className="mb-6">
          <label className="block font-medium mb-2 text-gray-800">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="mb-6">
          <label className="block font-medium mb-2 text-gray-800">AI Provider</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="custom">Custom Rules</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
        </div>

        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
            {message}
          </div>
        )}

        <button
          onClick={handleSave}
          className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
