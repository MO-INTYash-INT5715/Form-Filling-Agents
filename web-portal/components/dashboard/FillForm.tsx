'use client';

import { useState } from 'react';
import { Button } from '../ui/Button';

type Strategy = 'rule-based' | 'llm-structured' | 'embedding-matcher' | 'all';

const STRATEGIES: { value: Strategy; label: string; description: string }[] = [
  { value: 'rule-based',        label: 'Rule-Based',        description: 'Keyword matching — fast, offline, no API key' },
  { value: 'llm-structured',    label: 'LLM-Structured',    description: 'GPT-4o JSON mode — best accuracy, needs API key' },
  { value: 'embedding-matcher', label: 'Embedding-Matcher', description: 'Cosine similarity — semantic matching, offline' },
  { value: 'all',               label: 'Run All 3',         description: 'Compare all strategies side-by-side' },
];

interface Props {
  onSubmit: (url: string, strategy: Strategy) => void;
  loading?: boolean;
}

export function FillForm({ onSubmit, loading }: Props) {
  const [url, setUrl] = useState('http://localhost:5000/academic-research/job-application');
  const [strategy, setStrategy] = useState<Strategy>('rule-based');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      new URL(url);
    } catch {
      setError('Please enter a valid URL (e.g. http://localhost:5000/...)');
      return;
    }
    onSubmit(url, strategy);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Form URL</label>
        <input
          type="url"
          className="input"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="http://localhost:5000/..."
          required
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>

      <div>
        <label className="label">Fill Strategy</label>
        <div className="space-y-2">
          {STRATEGIES.map(s => (
            <label key={s.value} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ borderColor: strategy === s.value ? '#4f46e5' : '' }}>
              <input
                type="radio"
                name="strategy"
                value={s.value}
                checked={strategy === s.value}
                onChange={() => setStrategy(s.value)}
                className="mt-0.5"
              />
              <div>
                <span className="text-sm font-medium text-gray-800">{s.label}</span>
                <p className="text-xs text-gray-500">{s.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <Button type="submit" loading={loading} className="w-full">
        {loading ? 'Filling form…' : '🚀 Fill Form'}
      </Button>
    </form>
  );
}
