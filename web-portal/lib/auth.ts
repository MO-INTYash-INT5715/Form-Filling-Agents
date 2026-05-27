/**
 * Stub authentication helper.
 * Reads / writes a simple HttpOnly session cookie — no real DB.
 */

import { cookies } from 'next/headers';

const HARDCODED_USERS: Record<string, { name: string; password: string }> = {
  'alice@example.com': { name: 'Alice Zhang', password: 'demo' },
};

const SESSION_COOKIE = 'ffa_session';

export interface SessionUser {
  email: string;
  name: string;
}

/** Returns the current user from the session cookie, or null if not logged in. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf-8');
    return JSON.parse(decoded) as SessionUser;
  } catch {
    return null;
  }
}

/** Validates credentials. Returns the user record or null. */
export function validateCredentials(
  email: string,
  password: string
): SessionUser | null {
  const user = HARDCODED_USERS[email.toLowerCase()];
  if (!user || user.password !== password) return null;
  return { email, name: user.name };
}

/** Encodes a user into a base64 cookie value. */
export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

export { SESSION_COOKIE };
