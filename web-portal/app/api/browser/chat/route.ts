import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getCurrentUser } from '../../../../lib/auth';
import { getSession, updateSessionField } from '../../../../src/browser/session-manager';
import { chatWithLLM } from '../../../../src/agents/llm-chat';
import { flattenProfile } from '../../../../src/agents/types';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    runId?: string;
    message?: string;
    history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { runId, message, history = [] } = body;
  if (!runId || !message) {
    return NextResponse.json({ error: 'runId and message are required' }, { status: 400 });
  }

  const session = getSession(runId);
  if (!session) {
    return NextResponse.json({ error: 'Active browser session not found' }, { status: 404 });
  }

  try {
    // Load and flatten profile
    const profilePath = join(process.cwd(), 'data', 'test-profile.json');
    const rawProfile = JSON.parse(readFileSync(profilePath, 'utf-8'));
    const profile = flattenProfile(rawProfile);

    // Call reasoning LLM
    const chatResult = await chatWithLLM(message, history, session.fields, profile);

    // Apply any actions returned by LLM to the live browser and session state
    const appliedActions = [];
    for (const action of chatResult.actions) {
      const success = await updateSessionField(runId, action.fieldId, action.value);
      if (success) {
        appliedActions.push(action);
      }
    }

    return NextResponse.json({
      success: true,
      message: chatResult.message,
      actions: appliedActions,
      fields: session.fields,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
