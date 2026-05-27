'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ComparisonTable } from '../../../components/dashboard/ComparisonTable';
import type { AgentRunRecord } from '../../../src/types/telemetry';

export default function HistoryPage() {
  const router = useRouter();
  const [runs, setRuns]       = useState<AgentRunRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/telemetry?limit=200')
      .then(r => {
        if (r.status === 401) { router.push('/'); return; }
        return r.json();
      })
      .then(d => { if (d) setRuns(d.runs ?? []); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Run History</h1>
        <p className="text-sm text-gray-500">All agent runs with timing and token telemetry</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <div className="card">
          <ComparisonTable runs={runs} />
        </div>
      )}
    </div>
  );
}
