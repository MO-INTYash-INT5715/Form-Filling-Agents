import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth';
import { getRuns, getRunById, exportJson } from '../../../src/telemetry/tracker';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);

  // ?export=json → download full telemetry log
  if (searchParams.get('export') === 'json') {
    return new NextResponse(exportJson(), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="telemetry-${Date.now()}.json"`,
      },
    });
  }

  // ?id=<runId> → single run
  const id = searchParams.get('id');
  if (id) {
    const record = getRunById(id);
    if (!record) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(record);
  }

  // Default: all runs, newest first
  const limit = parseInt(searchParams.get('limit') ?? '100', 10);
  const runs = getRuns().slice(0, limit);
  return NextResponse.json({ runs, total: runs.length });
}
