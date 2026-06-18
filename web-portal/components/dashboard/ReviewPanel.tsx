'use client';

import { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { FieldTelemetry } from '../../src/types/telemetry';

interface Props {
  record: {
    runId: string;
    strategy: string;
    formUrl: string;
    formTitle?: string;
    fields: FieldTelemetry[];
    screenshotBase64?: string;
  };
  onSubmit: (overrides: Record<string, string>, missingSupplied: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
}

export function ReviewPanel({ record, onSubmit, onCancel }: Props) {
  const filledFields = record.fields.filter(f => f.valueFilled !== undefined);
  const missingFields = record.fields.filter(f => f.isMissing);
  const skippedFields = record.fields.filter(f => !f.isMissing && f.valueFilled === undefined);

  // Editable overrides for auto-filled values
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  // User-supplied values for missing required fields
  const [missingSupplied, setMissingSupplied] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Approve is enabled only when all required-missing fields have a value
  const allMissingFilled = missingFields.every(f => {
    const val = missingSupplied[f.fieldId];
    return val !== undefined && val.trim() !== '';
  });

  function handleOverride(fieldId: string, value: string) {
    setOverrides(prev => ({ ...prev, [fieldId]: value }));
  }

  function handleMissing(fieldId: string, value: string) {
    setMissingSupplied(prev => ({ ...prev, [fieldId]: value }));
  }

  async function handleApprove() {
    setSubmitting(true);
    setResult(null);
    try {
      const res = await onSubmit(overrides, missingSupplied);
      setResult(res);
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review & Verify</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {record.formTitle ?? record.formUrl}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge label={record.strategy} color={record.strategy as any} />
        </div>
      </div>

      {/* Result banner (shown after submit) */}
      {result && (
        <div className={`rounded-lg border p-4 ${
          result.success
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <p className="font-medium">
            {result.success ? '✓ Form submitted successfully!' : '✗ Submission failed'}
          </p>
          {result.error && <p className="text-sm mt-1">{result.error}</p>}
        </div>
      )}

      {/* Prefilled form screenshot */}
      {record.screenshotBase64 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-800 mb-3">Prefilled Form Preview</h2>
          <div className="rounded-lg border border-gray-200 overflow-hidden">
            <img
              src={`data:image/png;base64,${record.screenshotBase64}`}
              alt="Prefilled form screenshot"
              className="w-full h-auto max-h-[500px] object-contain bg-gray-50"
            />
          </div>
        </div>
      )}

      {/* Missing required fields (flagged) */}
      {missingFields.length > 0 && (
        <div className="card border-yellow-300 bg-yellow-50/30">
          <h2 className="text-base font-semibold text-yellow-800 mb-1">
            ⚠ Missing Required Data
          </h2>
          <p className="text-sm text-yellow-700 mb-3">
            These fields are required by the form but not found in your profile. Please provide values before submitting.
          </p>
          <div className="space-y-3">
            {missingFields.map(f => (
              <div key={f.fieldId} className="flex items-start gap-3">
                <label className="w-48 shrink-0 text-sm font-medium text-gray-700 pt-2">
                  {f.label || f.fieldId}
                  <span className="ml-1 text-red-500">*</span>
                  {f.type && f.type !== 'text' && (
                    <span className="ml-1 text-xs text-gray-400">({f.type})</span>
                  )}
                </label>
                <input
                  type={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : f.type === 'number' ? 'number' : 'text'}
                  className="input flex-1"
                  placeholder={`Enter ${f.label || f.fieldId}...`}
                  value={missingSupplied[f.fieldId] ?? ''}
                  onChange={e => handleMissing(f.fieldId, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filled fields table (editable) */}
      <div className="card">
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          Filled Fields
          <span className="ml-2 text-xs font-normal text-gray-400">({filledFields.length} auto-filled — click to edit)</span>
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Field</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Value</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Source</th>
                <th className="px-4 py-2 text-left font-medium text-gray-600">Conf.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filledFields.map(f => (
                <tr key={f.fieldId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">
                    {f.label || f.fieldId}
                    {f.required && <span className="ml-1 text-red-500">*</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{f.type}</td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono bg-white focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
                      value={overrides[f.fieldId] ?? f.valueFilled ?? ''}
                      onChange={e => handleOverride(f.fieldId, e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-500 max-w-[160px] truncate">
                    {f.matchedProfileKey ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    <ConfBar score={f.confidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Skipped optional fields (collapsed) */}
      {skippedFields.length > 0 && (
        <details className="card">
          <summary className="text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700">
            Skipped optional fields ({skippedFields.length})
          </summary>
          <div className="mt-2 space-y-1">
            {skippedFields.map(f => (
              <div key={f.fieldId} className="flex items-center gap-2 text-xs text-gray-400">
                <span>{f.label || f.fieldId}</span>
                <Badge label="skipped" color="warning" />
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Action bar */}
      <div className="card flex items-center justify-between sticky bottom-0 bg-white border-t-2 border-gray-200 shadow-lg">
        <div className="text-sm text-gray-500">
          {missingFields.length > 0 ? (
            <span className="text-yellow-600 font-medium">
              {missingFields.length - Object.keys(missingSupplied).filter(k => missingSupplied[k]?.trim()).length} required fields still need values
            </span>
          ) : (
            <span className="text-emerald-600 font-medium">All required fields have values — ready to submit</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={submitting || !!result?.success}>
            Cancel
          </Button>
          <Button
            onClick={handleApprove}
            loading={submitting}
            disabled={!allMissingFilled || !!result?.success}
          >
            ✓ Approve & Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

function ConfBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-yellow-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500">{pct}%</span>
    </div>
  );
}
