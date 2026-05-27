import type { Metadata } from 'next';
import './globals.css';
import { NavBar } from '../components/dashboard/NavBar';

export const metadata: Metadata = {
  title: 'FFA Web Portal',
  description: 'AI-powered form filling agent — comparative analysis dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <NavBar />
        <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
