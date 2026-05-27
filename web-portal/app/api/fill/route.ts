import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth';
import { runAgent, runAllStrategies } from '../../../src/agents/runner';
import type { AgentStrategyName } from '../../../src/agents/types';

export async function POST(req: NextRequest) {
  // Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    url?: string;
    strategy?: AgentStrategyName | 'all';
    profile?: Record<string, unknown>;
    executeInBrowser?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { url, strategy = 'rule-based', profile, executeInBrowser = false } = body;

  // Validate URL
  if (!url) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Only http/https URLs are allowed' }, { status: 400 });
  }
  // Block obvious SSRF targets
  const hostname = parsedUrl.hostname.toLowerCase();
  if (
    hostname === 'localhost' && parsedUrl.port !== '5000' && // allow FormFactory server
    ['169.254.', '10.', '172.16.', '192.168.'].some(p => hostname.startsWith(p))
  ) {
    return NextResponse.json({ error: 'Private/internal URLs are not allowed' }, { status: 400 });
  }

  try {
    if (strategy === 'all') {
      const results = await runAllStrategies(url, { profile, executeInBrowser });
      return NextResponse.json({ strategy: 'all', results });
    } else {
      const result = await runAgent(strategy as AgentStrategyName, url, { profile, executeInBrowser });
      return NextResponse.json({ strategy, result });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
