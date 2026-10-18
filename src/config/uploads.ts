import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const projectRoot = path.join(__dirname, '..', '..');

export const UPLOAD_DIR = path.join(projectRoot, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

/** Path stored in the database for an uploaded file; also its URL path under /uploads. */
export function toStoredPath(filename: string): string {
  return `uploads/${filename}`;
}

/** Deletes a stored upload; ignores anything outside the uploads folder. */
export async function removeStoredFile(filePath: string | null | undefined): Promise<void> {
  if (!filePath) return;
  const resolved = path.resolve(projectRoot, filePath);
  if (!resolved.startsWith(UPLOAD_DIR + path.sep)) return;
  await fs.promises.rm(resolved, { force: true });
}
