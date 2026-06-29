import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import { updateSessionField } from '../../../../src/browser/session-manager';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    runId?: string;
    fieldId?: string;
    value?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { runId, fieldId, value } = body;
  if (!runId || !fieldId || value === undefined) {
    return NextResponse.json({ error: 'runId, fieldId, and value are required' }, { status: 400 });
  }

  const success = await updateSessionField(runId, fieldId, value);
  return NextResponse.json({
    success,
    message: success ? 'Field synchronized to browser' : 'Session or field not found',
  });
}
