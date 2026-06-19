import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth';
import { getVerificationById } from '../../../src/telemetry/tracker';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');

  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 });
  }

  const verification = getVerificationById(runId);
  if (!verification) {
    return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
  }

  return NextResponse.json(verification);
}
