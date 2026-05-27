'use client';

type Strategy = 'rule-based' | 'llm-structured' | 'embedding-matcher' | 'all';

const COLORS: Record<string, string> = {
  'rule-based':        'bg-blue-100 text-blue-700',
  'llm-structured':    'bg-purple-100 text-purple-700',
  'embedding-matcher': 'bg-green-100 text-green-700',
  'all':               'bg-orange-100 text-orange-700',
  'success':           'bg-emerald-100 text-emerald-700',
  'error':             'bg-red-100 text-red-700',
  'warning':           'bg-yellow-100 text-yellow-700',
  'info':              'bg-gray-100 text-gray-600',
};

interface Props {
  label: string;
  color?: Strategy | 'success' | 'error' | 'warning' | 'info';
}

export function Badge({ label, color = 'info' }: Props) {
  const cls = COLORS[color] ?? COLORS['info'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}
