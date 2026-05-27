'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../components/ui/Button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('alice@example.com');
  const [password, setPassword] = useState('demo');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        const data = await res.json();
        setError(data.error ?? 'Login failed');
      }
    } catch {
      setError('Network error — is the portal running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🤖</div>
          <h1 className="text-xl font-bold text-gray-900">FFA Web Portal</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered form filling &amp; analysis</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={password}
              onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && (
            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <Button type="submit" loading={loading} className="w-full">
            Sign In
          </Button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-4">
          Demo credentials: alice@example.com / demo
        </p>
      </div>
    </div>
  );
}
