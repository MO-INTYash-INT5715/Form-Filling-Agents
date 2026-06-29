'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ReviewPanel } from '../../../components/dashboard/ReviewPanel';

interface Field {
  fieldId: string;
  label?: string;
  type: string;
  valueFilled?: string;
  isMissing?: boolean;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function ReviewPageContent() {
  const searchParams = useSearchParams();
  const runId = searchParams.get('runId');
  const router = useRouter();

  const [record, setRecord] = useState<any>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live session state
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Keep a ref to track if we need to stop session on unmount
  const sessionActiveRef = useRef(false);

  useEffect(() => {
    if (!runId) {
      setError('No runId provided');
      return;
    }

    const stored = sessionStorage.getItem(`verification_${runId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecord(parsed);

        // Convert the record's fields to our editable state
        const initialFields: Field[] = (parsed.fields || []).map((f: any) => ({
          fieldId: f.fieldId,
          label: f.label,
          type: f.type,
          valueFilled: f.valueFilled,
          isMissing: f.isMissing,
        }));
        setFields(initialFields);
        return;
      } catch (err) {
        console.error('Failed to parse session storage:', err);
      }
    }

    setError('Session data not found. Please go back to the dashboard and fill the form again.');
  }, [runId]);

  // Clean up browser session on unmount
  useEffect(() => {
    return () => {
      if (sessionActiveRef.current && runId) {
        // Send a fire-and-forget beacon or request to close browser
        fetch('/api/browser/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId }),
        }).catch((err) => console.error('Cleanup browser session failed:', err));
      }
    };
  }, [runId]);

  // Start the live browser session
  const handleStartBrowser = async () => {
    if (!runId || !record) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/browser/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          formUrl: record.formUrl,
          fields: fields.map((f) => ({
            fieldId: f.fieldId,
            value: f.valueFilled || '',
            type: f.type,
            label: f.label,
          })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsBrowserOpen(true);
        sessionActiveRef.current = true;
        setMessages([
          {
            role: 'assistant',
            content: `I've opened the form in a headed Chromium window and populated the initial values. Feel free to type queries here to modify values or clarify fields!`,
          },
        ]);
      } else {
        setError(data.error || 'Failed to start browser session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Sync manual field change to browser live
  const handleFieldChange = async (fieldId: string, newValue: string) => {
    // Update local state immediately
    setFields((prev) =>
      prev.map((f) => (f.fieldId === fieldId ? { ...f, valueFilled: newValue } : f))
    );

    // If browser is active, sync live
    if (isBrowserOpen && runId) {
      try {
        await fetch('/api/browser/sync-field', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ runId, fieldId, value: newValue }),
        });
      } catch (err) {
        console.error('Failed to sync field value to browser:', err);
      }
    }
  };

  // Send message to LLM
  const handleSendMessage = async (text: string) => {
    if (!runId || !text.trim()) return;

    // Optimistically update message history
    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setChatLoading(true);

    try {
      const res = await fetch('/api/browser/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          message: text,
          history: messages,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.message }]);
        
        // Update local fields state if LLM updated anything
        if (data.fields) {
          const updatedFields: Field[] = (data.fields || []).map((f: any) => ({
            fieldId: f.fieldId,
            label: f.label,
            type: f.type,
            valueFilled: f.value,
            isMissing: fields.find((original) => original.fieldId === f.fieldId)?.isMissing,
          }));
          setFields(updatedFields);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: `Error: ${data.error || 'Failed to get response.'}` },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Connection error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Approve & finish the session
  const handleSubmit = async () => {
    if (!runId) return;
    setSubmitting(true);

    try {
      // Since browser is already open and fully filled, stopping the session is all that's left
      // and we redirect back to the dashboard.
      await fetch('/api/browser/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      sessionActiveRef.current = false;
      sessionStorage.removeItem(`verification_${runId}`);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (runId) {
      await fetch('/api/browser/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      }).catch(() => {});
      sessionActiveRef.current = false;
      sessionStorage.removeItem(`verification_${runId}`);
    }
    router.push('/dashboard');
  };

  if (error) {
    return (
      <div className="card space-y-3">
        <h2 className="text-base font-semibold text-red-700">⚠ Error</h2>
        <p className="text-sm text-red-600">{error}</p>
        <button className="text-sm text-brand-600 underline" onClick={handleCancel}>
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="card text-sm text-gray-500 text-center py-8">
        Loading review data…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReviewPanel
        record={record}
        fields={fields}
        onFieldChange={handleFieldChange}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isBrowserOpen={isBrowserOpen}
        onStartBrowser={handleStartBrowser}
        messages={messages}
        onSendMessage={handleSendMessage}
        chatLoading={chatLoading}
        submitting={submitting}
      />
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="card text-sm text-gray-500 text-center py-8">
          Loading…
        </div>
      }
    >
      <ReviewPageContent />
    </Suspense>
  );
}
