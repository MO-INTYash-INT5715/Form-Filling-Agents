'use client';

import { useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { AgentRunRecord } from '../../src/types/telemetry';

interface Props {
  runs: AgentRunRecord[];
}

type SortKey = keyof Pick<AgentRunRecord,
  'timestamp' | 'strategy' | 'scrapeTimeMs' | 'fillTimeMs' | 'totalTimeMs' |
  'fieldsAttempted' | 'fieldsFilled' | 'fillAccuracyPct'>;

export function ComparisonTable({ runs }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  function toggle(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = [...runs].sort((a, b) => {
    const av = a[sortKey] as string | number;
    const bv = b[sortKey] as string | number;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function exportJson() {
    window.open('/api/telemetry?export=json', '_blank');
  }

  const ColHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-3 py-2 text-left text-xs font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
      onClick={() => toggle(k)}
    >
      {label} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{runs.length} run{runs.length !== 1 ? 's' : ''} recorded</p>
        <Button variant="secondary" size="sm" onClick={exportJson}>
          ↓ Export JSON
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <ColHeader label="Time"         k="timestamp" />
              <ColHeader label="Strategy"     k="strategy" />
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">URL</th>
              <ColHeader label="Scrape ms"    k="scrapeTimeMs" />
              <ColHeader label="Fill ms"      k="fillTimeMs" />
              <ColHeader label="Total ms"     k="totalTimeMs" />
              <ColHeader label="Attempted"    k="fieldsAttempted" />
              <ColHeader label="Filled"       k="fieldsFilled" />
              <ColHeader label="Accuracy %"   k="fillAccuracyPct" />
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Prompt Tok.</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Compl. Tok.</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Cost $</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Fallback?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map(r => (
              <tr key={r.runId} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(r.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-3 py-2">
                  <Badge label={r.strategy} color={r.strategy as any} />
                </td>
                <td className="px-3 py-2 text-xs text-gray-700 max-w-[200px] truncate" title={r.formUrl}>
                  {r.formUrl.replace(/^https?:\/\//, '')}
                </td>
                <Num v={r.scrapeTimeMs} />
                <Num v={r.fillTimeMs} />
                <Num v={r.totalTimeMs} highlight />
                <Num v={r.fieldsAttempted} />
                <Num v={r.fieldsFilled} />
                <td className="px-3 py-2 text-xs font-semibold text-brand-600">{r.fillAccuracyPct.toFixed(1)}%</td>
                <Num v={r.llm?.promptTokens ?? '—'} />
                <Num v={r.llm?.completionTokens ?? '—'} />
                <td className="px-3 py-2 text-xs text-gray-700">
                  {r.llm ? `$${r.llm.costUsd.toFixed(5)}` : '—'}
                </td>
                <td className="px-3 py-2">
                  {r.llmFallbackUsed
                    ? <Badge label="yes" color="warning" />
                    : <span className="text-gray-400 text-xs">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {runs.length === 0 && (
          <p className="text-center py-8 text-sm text-gray-400">No runs yet — fill a form to see data here.</p>
        )}
      </div>
    </div>
  );
}

function Num({ v, highlight }: { v: number | string; highlight?: boolean }) {
  return (
    <td className={`px-3 py-2 text-xs ${highlight ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
      {typeof v === 'number' ? v.toLocaleString() : v}
    </td>
  );
}
