'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FillForm } from '../../components/dashboard/FillForm';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { AgentRunRecord } from '../../src/types/telemetry';

type Strategy = 'rule-based' | 'llm-structured' | 'embedding-matcher' | 'all';

export default function DashboardPage() {
  const router = useRouter();
  const [recentRuns, setRecentRuns] = useState<AgentRunRecord[]>([]);
  const [loading, setLoading]       = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Fetch recent runs on mount
  useEffect(() => {
    fetchRecentRuns();
  }, []);

  async function fetchRecentRuns() {
    try {
      const res = await fetch('/api/telemetry?limit=5');
      if (res.status === 401) { router.push('/'); return; }
      const data = await res.json();
      setRecentRuns(data.runs ?? []);
    } catch { /* silently ignore */ }
  }

  async function handleFill(url: string, strategy: Strategy) {
    setLoading(true);
    try {
      const res = await fetch('/api/fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, strategy }),
      });
      if (res.status === 401) { router.push('/'); return; }

      const data = await res.json();

      if (strategy === 'all') {
        // "Run all 3" → compare page (side-by-side ReviewPanels, refetches /api/fill)
        router.push(`/dashboard/fill?strategy=all&url=${encodeURIComponent(url)}`);
      } else {
        // Single strategy → straight to review page
        const runId = data.verification?.runId;
        if (runId) {
          router.push(`/dashboard/review?runId=${runId}`);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Fill forms and compare agent strategies</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => router.push('/dashboard/history')}>
          View Full History →
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="card space-y-3">
          <h2 className="text-base font-semibold text-gray-800">Test Profile</h2>
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">Name:</span> Alice Jane Zhang</p>
            <p><span className="font-medium">Email:</span> alice.zhang@example.com</p>
            <p><span className="font-medium">Role:</span> Software Engineer</p>
            <p><span className="font-medium">Company:</span> Tech Innovations Inc</p>
            <p><span className="font-medium">Location:</span> Springfield, IL 62704</p>
          </div>
          <div className="pt-2 space-y-1">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Domains covered</p>
            <div className="flex flex-wrap gap-1">
              {['Academic','Finance','Legal','Health','Arts','Startup','Construction'].map(d => (
                <Badge key={d} label={d} color="info" />
              ))}
            </div>
          </div>
          {!profileLoaded && (
            <Button variant="secondary" size="sm" className="w-full" onClick={() => setProfileLoaded(true)}>
              ✓ Profile loaded (test-profile.json)
            </Button>
          )}
          {profileLoaded && <Badge label="✓ Profile active" color="success" />}
        </div>

        {/* Fill form card */}
        <div className="card lg:col-span-1">
          <h2 className="text-base font-semibold text-gray-800 mb-4">Fill a Form</h2>
          <FillForm onSubmit={handleFill} loading={loading} />
        </div>

        {/* Recent runs card */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">Recent Runs</h2>
            <button onClick={fetchRecentRuns} className="text-xs text-gray-400 hover:text-gray-600">↻ Refresh</button>
          </div>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No runs yet</p>
          ) : (
            <div className="space-y-2">
              {recentRuns.map(r => (
                <div key={r.runId} className="flex items-center justify-between text-sm rounded-lg bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge label={r.strategy} color={r.strategy as any} />
                    <span className="text-xs text-gray-500 truncate">
                      {r.formUrl.replace(/^https?:\/\/[^/]+/, '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-semibold text-brand-600">{r.fillAccuracyPct.toFixed(0)}%</span>
                    <span className="text-xs text-gray-400">{r.totalTimeMs}ms</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
