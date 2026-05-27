'use client';

import { Badge } from '../ui/Badge';
import type { AgentRunRecord } from '../../src/types/telemetry';

interface Props {
  record: AgentRunRecord;
}

export function ResultsTable({ record }: Props) {
  const filled   = record.fields.filter(f => f.valueFilled !== undefined);
  const skipped  = record.fields.filter(f => f.valueFilled === undefined);

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Strategy"    value={<Badge label={record.strategy} color={record.strategy as any} />} />
        <Stat label="Filled"      value={`${record.fieldsFilled} / ${record.fields.length}`} />
        <Stat label="Accuracy"    value={`${record.fillAccuracyPct.toFixed(1)}%`} highlight />
        <Stat label="Total time"  value={`${record.totalTimeMs} ms`} />
        <Stat label="Scrape"      value={`${record.scrapeTimeMs} ms`} />
        <Stat label="Fill"        value={`${record.fillTimeMs} ms`} />
        {record.llm && (
          <>
            <Stat label="Tokens"   value={`${record.llm.totalTokens}`} />
            <Stat label="Cost"     value={`$${record.llm.costUsd.toFixed(5)}`} />
          </>
        )}
        {record.llmFallbackUsed && (
          <div className="col-span-2">
            <Badge label="⚠ LLM unavailable — used rule-based fallback" color="warning" />
          </div>
        )}
      </div>

      {/* Per-field table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Field ID</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Label</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Type</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Value Filled</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Profile Key</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Conf.</th>
              <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {record.fields.map(f => (
              <tr key={f.fieldId} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs text-gray-700">{f.fieldId}</td>
                <td className="px-4 py-2 text-gray-700">{f.label ?? '—'}</td>
                <td className="px-4 py-2 text-gray-500">{f.type}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-800 max-w-[180px] truncate">
                  {f.valueFilled ?? <span className="text-gray-400 italic">—</span>}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500 max-w-[160px] truncate">
                  {f.matchedProfileKey ?? '—'}
                </td>
                <td className="px-4 py-2">
                  <ConfBar score={f.confidence} />
                </td>
                <td className="px-4 py-2">
                  {f.valueFilled !== undefined
                    ? <Badge label="filled"   color="success" />
                    : <Badge label="skipped"  color="warning" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {record.errors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 space-y-1">
          {record.errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <div className={`text-sm font-semibold ${highlight ? 'text-brand-600' : 'text-gray-800'}`}>
        {value}
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
