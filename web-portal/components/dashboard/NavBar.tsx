'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '../ui/Button';

export function NavBar() {
  const router   = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  const linkCls = (path: string) =>
    `text-sm px-3 py-1.5 rounded-lg transition-colors ${
      pathname.startsWith(path)
        ? 'bg-brand-600 text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`;

  // Don't show nav on login page
  if (pathname === '/') return null;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 flex h-14 items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-gray-900 mr-4">
          🤖 <span>FFA Portal</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link href="/dashboard" className={linkCls('/dashboard')}>
            Dashboard
          </Link>
          <Link href="/dashboard/history" className={linkCls('/dashboard/history')}>
            History
          </Link>
        </nav>

        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
