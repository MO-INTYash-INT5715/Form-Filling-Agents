'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ResultsTable } from '../../../components/dashboard/ResultsTable';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { AgentRunRecord } from '../../../src/types/telemetry';

function FillResultsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const strategy = params.get('strategy');
  const runId    = params.get('runId');
  const url      = params.get('url');

  const [records, setRecords]   = useState<AgentRunRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (strategy === 'all' && url) {
      fetchAll(url);
    } else if (runId) {
      fetchOne(runId);
    }
  }, [strategy, runId, url]);

  async function fetchAll(formUrl: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formUrl, strategy: 'all' }),
      });
      if (res.status === 401) { router.push('/'); return; }
      const data = await res.json();
      setRecords(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching results');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOne(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/telemetry?id=${id}`);
      if (res.status === 401) { router.push('/'); return; }
      if (!res.ok) { setError('Run not found'); return; }
      const record = await res.json();
      setRecords([record]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching run');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🤖</div>
          <p className="text-gray-500">Running agents{strategy === 'all' ? ' (all 3 in parallel)' : ''}…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-10">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => router.push('/dashboard')}>← Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fill Results</h1>
          <p className="text-sm text-gray-500 mt-0.5">{url ?? records[0]?.formUrl}</p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/dashboard')}>← Dashboard</Button>
      </div>

      {strategy === 'all' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {records.map(r => (
            <div key={r.runId} className="card">
              <div className="flex items-center gap-2 mb-4">
                <Badge label={r.strategy} color={r.strategy as any} />
                <span className="text-xs text-gray-400">{r.totalTimeMs} ms total</span>
              </div>
              <ResultsTable record={r} />
            </div>
          ))}
        </div>
      ) : (
        records.map(r => (
          <div key={r.runId} className="card">
            <ResultsTable record={r} />
          </div>
        ))
      )}
    </div>
  );
}

export default function FillResultsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24 text-gray-400">Loading…</div>}>
      <FillResultsContent />
    </Suspense>
  );
}
