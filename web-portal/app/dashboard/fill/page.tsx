'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ReviewPanel } from '../../../components/dashboard/ReviewPanel';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { AgentRunRecord, VerificationRecord } from '../../../src/types/telemetry';

interface FillResult {
  record: AgentRunRecord;
  verification: VerificationRecord;
}

function FillResultsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const strategy = params.get('strategy');
  const runId    = params.get('runId');
  const url      = params.get('url');

  const [results, setResults] = useState<FillResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

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
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching results');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOne(id: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/verification?runId=${id}`);
      if (res.status === 401) { router.push('/'); return; }
      if (!res.ok) { setError('Run not found'); return; }
      const verification = await res.json();
      setResults([{ record: verification, verification }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching run');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    _runId: string,
    overrides: Record<string, string>,
    missingSupplied: Record<string, string>
  ) {
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId: _runId, overrides, missingSupplied }),
      });
      if (res.status === 401) { router.push('/'); return { success: false, error: 'Unauthorized' }; }
      return await res.json();
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Submit failed' };
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

  // Compare view: one ReviewPanel per strategy, side-by-side
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compare & Verify</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Review each strategy side-by-side. Approve the one you want to submit.
          </p>
        </div>
        <Button variant="secondary" onClick={() => router.push('/dashboard')}>← Dashboard</Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {results.map(r => (
          <div key={r.verification.runId} className="card">
            <div className="flex items-center gap-2 mb-4">
              <Badge label={r.verification.strategy} color={r.verification.strategy as any} />
              <span className="text-xs text-gray-400">
                {r.record.totalTimeMs ?? r.verification.createdAt} ms total
              </span>
            </div>
            <ReviewPanel
              record={{
                runId: r.verification.runId,
                strategy: r.verification.strategy,
                formUrl: r.verification.formUrl,
                formTitle: r.verification.formTitle,
                fields: r.verification.fields,
                screenshotBase64: r.verification.screenshotBase64,
              }}
              onSubmit={(o, m) => handleSubmit(r.verification.runId, o, m)}
              onCancel={() => router.push('/dashboard')}
            />
          </div>
        ))}
      </div>
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
