import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth';
import * as tracker from '../../../src/telemetry/tracker';

export async function GET(req: NextRequest) {
  // Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const runId = req.nextUrl.searchParams.get('runId');
  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 });
  }

  const verification = tracker.getVerificationById(runId);
  if (!verification) {
    return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
  }

  return NextResponse.json(verification);
}
