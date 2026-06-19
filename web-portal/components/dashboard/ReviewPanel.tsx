'use client';

import { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface Props {
  record: any;
  onSubmit: (overrides: Record<string, string>, missingSupplied: Record<string, string>) => Promise<void>;
  onCancel: () => void;
}

export function ReviewPanel({ record, onSubmit, onCancel }: Props) {
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [missingSupplied, setMissingSupplied] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const missingFields = record.fields.filter((f: any) => f.isMissing);
  const filledFields = record.fields.filter((f: any) => !f.isMissing && f.valueFilled !== undefined);

  const handleOverride = (fieldId: string, value: string) => {
    setOverrides(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleMissing = (fieldId: string, value: string) => {
    setMissingSupplied(prev => ({ ...prev, [fieldId]: value }));
  };

  const allMissingFilled = missingFields.every((f: any) => missingSupplied[f.fieldId]?.trim());

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit(overrides, missingSupplied);
    setSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-bold">Review Fills</h2>
          <p className="text-sm text-gray-500">Please review the filled form data before proceeding.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!allMissingFilled || submitting}
          >
            {submitting ? 'Launching...' : 'Open Form & Fill Data'}
          </Button>
        </div>
      </div>

      {missingFields.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-bold text-yellow-800 mb-2">⚠ Missing Required Data</h3>
          <div className="space-y-3">
            {missingFields.map((f: any) => (
              <div key={f.fieldId} className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700">{f.label || f.fieldId}</label>
                <input 
                  type="text" 
                  className="border rounded px-2 py-1 text-sm"
                  placeholder={`Enter value for ${f.type}`}
                  value={missingSupplied[f.fieldId] || ''}
                  onChange={(e) => handleMissing(f.fieldId, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {record.screenshotBase64 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 border-b">
            Form Preview
          </div>
          <img src={`data:image/png;base64,${record.screenshotBase64}`} alt="Form Preview" className="max-w-full h-auto" />
        </div>
      )}

      <div>
        <h3 className="text-sm font-bold mb-3">Filled Fields</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Field</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Extracted Value</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filledFields.map((f: any) => (
                <tr key={f.fieldId} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <div className="font-semibold text-gray-800">{f.label || f.fieldId}</div>
                    <div className="text-xs text-gray-500 font-mono">{f.fieldId}</div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-800">
                    {f.valueFilled}
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      className="border rounded px-2 py-1 text-sm w-full"
                      placeholder="Override value"
                      value={overrides[f.fieldId] ?? f.valueFilled}
                      onChange={(e) => handleOverride(f.fieldId, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
