/**
 * /api/parse  — POST (multipart/form-data)
 *
 * Accepts a file upload and returns a parsed UserProfile JSON.
 * Supported formats: PDF, DOCX, TXT, JSON.
 *
 * Next.js API Route (pages/api/parse.ts)
 * Uses multer for file handling.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import type { ParseDocumentResponse } from '../../types/index';
import { parseDocument } from '../../parsers/document-parser';
import { IncomingForm, File } from 'formidable';
import * as fs from 'fs';

// Disable default Next.js body parsing so formidable can handle multipart
export const config = { api: { bodyParser: false } };

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/json',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ParseDocumentResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new IncomingForm({
    maxFileSize: MAX_FILE_SIZE,
    filter: ({ mimetype }) => !!mimetype && ALLOWED_MIME_TYPES.has(mimetype),
  });

  let fields: Record<string, string[]>;
  let files: Record<string, File[]>;

  try {
    [fields, files] = await new Promise((resolve, reject) =>
      form.parse(req, (err, f, fi) => (err ? reject(err) : resolve([f as any, fi as any])))
    );
  } catch (err) {
    return res.status(400).json({ error: 'Failed to parse upload: ' + (err instanceof Error ? err.message : 'unknown') });
  }

  const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
  if (!uploadedFile) {
    return res.status(400).json({ error: 'No file uploaded (field name must be "file")' });
  }

  const mimeType = uploadedFile.mimetype ?? 'application/octet-stream';
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return res.status(415).json({ error: `Unsupported file type: ${mimeType}` });
  }

  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(uploadedFile.filepath);
  } catch {
    return res.status(500).json({ error: 'Failed to read uploaded file' });
  } finally {
    // Clean up temp file
    fs.unlink(uploadedFile.filepath, () => {});
  }

  const documentId = Date.now().toString(36);
  const result = await parseDocument(documentId, mimeType, buffer);
  return res.status(200).json(result);
}
