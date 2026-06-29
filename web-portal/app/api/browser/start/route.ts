import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../../lib/auth';
import { startSession } from '../../../../src/browser/session-manager';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    runId?: string;
    formUrl?: string;
    fields?: Array<{ fieldId: string; value: string; type: string; label?: string }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { runId, formUrl, fields = [] } = body;
  if (!runId || !formUrl) {
    return NextResponse.json({ error: 'runId and formUrl are required' }, { status: 400 });
  }

  try {
    const session = await startSession(runId, formUrl, fields);
    return NextResponse.json({
      success: true,
      message: 'Browser session started successfully',
      fields: session.fields,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
