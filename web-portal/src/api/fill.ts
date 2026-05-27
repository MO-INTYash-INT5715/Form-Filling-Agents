/**
 * /api/fill  — POST
 *
 * Accepts a URL and either a stored profileId or an inline profile.
 * Scrapes the form, maps profile values, fills the form via Playwright,
 * and returns a FillResult.
 *
 * Next.js API Route (pages/api/fill.ts)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { SubmitFillRequest, SubmitFillResponse, FillJob } from '../../types/index';
import { scrapeForm } from '../../scraper/form-scraper';
import { fillForm } from '../../filler/form-filler';

// TODO: replace with real DB / job queue
const jobStore = new Map<string, FillJob>();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitFillResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as SubmitFillRequest;

  if (!body?.url) {
    return res.status(400).json({ error: 'url is required' });
  }

  // Validate URL format
  let targetUrl: URL;
  try {
    targetUrl = new URL(body.url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Only allow http/https (prevent SSRF to internal metadata endpoints etc.)
  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return res.status(400).json({ error: 'Only http/https URLs are allowed' });
  }

  const profile = body.profile;
  if (!profile) {
    return res.status(400).json({ error: 'profile is required (profileId lookup not yet implemented)' });
  }

  const jobId = generateId();

  // Respond immediately with job ID (async processing)
  const job: FillJob = {
    id: jobId,
    userId: 'anonymous', // TODO: get from session
    url: body.url,
    profileId: body.profileId ?? 'inline',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  jobStore.set(jobId, job);

  res.status(202).json({ jobId, status: 'pending' });

  // Process asynchronously
  try {
    job.status = 'running';
    const form = await scrapeForm(body.url);
    const result = await fillForm(body.url, form, profile as any, { headless: true });
    job.status = 'completed';
    job.result = result;
    job.completedAt = new Date().toISOString();
  } catch (err) {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : 'Unknown error';
    job.completedAt = new Date().toISOString();
  }
}

// Export jobStore for the /api/jobs/[id] route to query
export { jobStore };
