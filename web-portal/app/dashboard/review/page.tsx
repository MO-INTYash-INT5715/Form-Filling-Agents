'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ReviewPanel } from '../../../components/dashboard/ReviewPanel';

function ReviewPageContent() {
  const searchParams = useSearchParams();
  const runId = searchParams.get('runId');
  const router = useRouter();
  const [record, setRecord] = useState<any>(null);
  const [error, setError] = useState('');
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (!runId) {
      setError('No runId provided');
      return;
    }

    // Read verification data from sessionStorage — written by dashboard/page.tsx
    // immediately after /api/fill responds. This avoids the in-memory server store
    // which gets wiped on HMR restarts or across separate serverless instances.
    const stored = sessionStorage.getItem(`verification_${runId}`);
    if (stored) {
      try {
        setRecord(JSON.parse(stored));
        return;
      } catch {
        // Corrupt data — fall through to error
      }
    }

    setError(
      'Session data not found. Please go back to the dashboard and fill the form again.'
    );
  }, [runId]);

  if (error) {
    return (
      <div className="card space-y-3">
        <h2 className="text-base font-semibold text-red-700">⚠ Error</h2>
        <p className="text-sm text-red-600">{error}</p>
        <button
          className="text-sm text-brand-600 underline"
          onClick={() => router.push('/dashboard')}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="card text-sm text-gray-500 text-center py-8">
        Loading review data…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {launching && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
          ✓ Browser session launched! A Chromium window has opened with the filled form.
          Please review the data and submit manually. Returning to dashboard…
        </div>
      )}
      <ReviewPanel
        record={record}
        onSubmit={async (overrides, missingSupplied) => {
          setLaunching(true);

          // Build the final merged fields list client-side.
          // Priority: missingSupplied > overrides > original valueFilled
          const finalFields: Array<{ fieldId: string; value: string; type: string }> = [];
          for (const f of record.fields ?? []) {
            const value = missingSupplied[f.fieldId] ?? overrides[f.fieldId] ?? f.valueFilled;
            if (value !== undefined) {
              finalFields.push({ fieldId: f.fieldId, value, type: f.type });
            }
          }

          // Send formUrl + merged fields directly — no server-side lookup needed.
          const res = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              formUrl: record.formUrl,
              fields: finalFields,
            }),
          });

          const result = await res.json();
          if (result.success) {
            // Clean up sessionStorage entry now that it's been used
            sessionStorage.removeItem(`verification_${runId}`);
            // Give the user a moment to see the green banner before navigating back
            await new Promise(r => setTimeout(r, 2000));
            router.push('/dashboard');
          } else {
            setLaunching(false);
            setError(result.error || 'Failed to launch browser session');
          }
        }}
        onCancel={() => {
          sessionStorage.removeItem(`verification_${runId}`);
          router.push('/dashboard');
        }}
      />
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="card text-sm text-gray-500 text-center py-8">
          Loading…
        </div>
      }
    >
      <ReviewPageContent />
    </Suspense>
  );
}
