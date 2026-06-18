'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ReviewPanel } from '../../../components/dashboard/ReviewPanel';
import { Button } from '../../../components/ui/Button';
import type { VerificationRecord } from '../../../src/types/telemetry';

function ReviewContent() {
  const params = useSearchParams();
  const router = useRouter();
  const runId = params.get('runId');

  const [verification, setVerification] = useState<VerificationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!runId) {
      setError('Missing runId parameter');
      setLoading(false);
      return;
    }
    fetchVerification(runId);
  }, [runId]);

  async function fetchVerification(id: string) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/verification?runId=${id}`);
      if (res.status === 401) { router.push('/'); return; }
      if (!res.ok) { setError('Verification not found'); return; }
      const data = await res.json();
      setVerification(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading verification');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    overrides: Record<string, string>,
    missingSupplied: Record<string, string>
  ) {
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, overrides, missingSupplied }),
      });
      if (res.status === 401) { router.push('/'); return { success: false, error: 'Unauthorized' }; }
      const data = await res.json();
      return data;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Submit failed' };
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🔍</div>
          <p className="text-gray-500">Loading preview…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card max-w-lg mx-auto text-center py-10">
        <p className="text-red-600 mb-4">{error}</p>
        <Button variant="secondary" onClick={() => router.push('/dashboard')}>← Back to Dashboard</Button>
      </div>
    );
  }

  if (!verification) return null;

  return (
    <ReviewPanel
      record={{
        runId: verification.runId,
        strategy: verification.strategy,
        formUrl: verification.formUrl,
        formTitle: verification.formTitle,
        fields: verification.fields,
        screenshotBase64: verification.screenshotBase64,
      }}
      onSubmit={handleSubmit}
      onCancel={() => router.push('/dashboard')}
    />
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24 text-gray-400">Loading…</div>}>
      <ReviewContent />
    </Suspense>
  );
}
