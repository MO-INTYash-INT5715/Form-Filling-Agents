'use client';

import { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface Field {
  fieldId: string;
  label?: string;
  type: string;
  valueFilled?: string;
  isMissing?: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  record: any;
  fields: Field[];
  onFieldChange: (fieldId: string, newValue: string) => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  // Browser interactive session states
  isBrowserOpen: boolean;
  onStartBrowser: () => Promise<void>;
  messages: Message[];
  onSendMessage: (text: string) => Promise<void>;
  chatLoading: boolean;
  submitting: boolean;
}

export function ReviewPanel({
  record,
  fields,
  onFieldChange,
  onSubmit,
  onCancel,
  isBrowserOpen,
  onStartBrowser,
  messages,
  onSendMessage,
  chatLoading,
  submitting,
}: Props) {
  const [inputText, setInputText] = useState('');

  const missingFields = fields.filter((f) => f.isMissing);
  const filledFields = fields.filter((f) => !f.isMissing);

  // Missing fields are considered "filled" if they have a non-empty valueFilled
  const allMissingFilled = missingFields.every((f) => f.valueFilled && f.valueFilled.trim());

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || chatLoading) return;
    const text = inputText;
    setInputText('');
    await onSendMessage(text);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Form Details, Fields, and Overrides */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="text-xl font-bold">Review Fills</h2>
            <p className="text-sm text-gray-500">Please review and edit form data.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            {!isBrowserOpen ? (
              <Button onClick={onStartBrowser} disabled={submitting}>
                {submitting ? 'Launching Browser...' : 'Open Form & Fill Data'}
              </Button>
            ) : (
              <Button onClick={onSubmit} disabled={!allMissingFilled || submitting} className="bg-green-600 hover:bg-green-700">
                {submitting ? 'Submitting...' : 'Complete & Approve'}
              </Button>
            )}
          </div>
        </div>

        {missingFields.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="text-sm font-bold text-amber-800 mb-2">⚠ Missing Required Data</h3>
            <div className="space-y-3">
              {missingFields.map((f) => (
                <div key={f.fieldId} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-gray-700">{f.label || f.fieldId}</label>
                  <input
                    type="text"
                    className="border border-amber-300 rounded px-2 py-1.5 text-sm focus:outline-amber-500"
                    placeholder={`Enter value for ${f.type}`}
                    value={f.valueFilled || ''}
                    onChange={(e) => onFieldChange(f.fieldId, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {record.screenshotBase64 && !isBrowserOpen && (
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 border-b">
              Static Form Preview
            </div>
            <img src={`data:image/png;base64,${record.screenshotBase64}`} alt="Form Preview" className="max-w-full h-auto" />
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold mb-3">Filled Fields</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">Field</th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">Extracted/Current Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filledFields.map((f) => (
                  <tr key={f.fieldId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">{f.label || f.fieldId}</div>
                      <div className="text-xs text-gray-500 font-mono">{f.fieldId}</div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-full focus:ring-1 focus:ring-brand-500 focus:outline-none"
                        value={f.valueFilled || ''}
                        onChange={(e) => onFieldChange(f.fieldId, e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Column: Reasoning LLM Chat Assistant */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl flex flex-col h-[650px] shadow-sm overflow-hidden">
        {/* Chat Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">Form Assistant</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-2.5 w-2.5 rounded-full ${isBrowserOpen ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="text-xs text-gray-500">
                {isBrowserOpen ? 'Live Browser Connected' : 'Browser Offline'}
              </span>
            </div>
          </div>
          <Badge variant={isBrowserOpen ? 'success' : 'neutral'}>Reasoning LLM</Badge>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-sm font-semibold text-gray-700">Chat with the Form Assistant</p>
              <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                {!isBrowserOpen 
                  ? "Launch the browser to ask questions or make changes to the form live."
                  : "Type a message below to modify fields or ask questions about the form!"}
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {chatLoading && (
            <div className="flex items-center gap-2 text-gray-500 text-xs pl-1">
              <span className="animate-bounce">●</span>
              <span className="animate-bounce [animation-delay:0.2s]">●</span>
              <span className="animate-bounce [animation-delay:0.4s]">●</span>
              <span>Assistant is thinking...</span>
            </div>
          )}
        </div>

        {/* Chat Form */}
        <form onSubmit={handleSend} className="bg-white border-t p-3">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder={isBrowserOpen ? "Ask the assistant to fill or explain..." : "Start the browser session first"}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={!isBrowserOpen || chatLoading}
            />
            <Button
              type="submit"
              disabled={!isBrowserOpen || chatLoading || !inputText.trim()}
              size="sm"
            >
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
