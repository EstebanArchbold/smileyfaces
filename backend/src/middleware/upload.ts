import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { compressToWebp, PASSTHROUGH_MIME } from '../config/images';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  // Stays generous because this is the size accepted from the camera; what
  // actually lands on disk is whatever compressUpload produces below.
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — high-quality photos
});

/**
 * Runs after multer and replaces the file it just wrote with a WebP version,
 * so a 10MB camera photo is not what ends up being served.
 *
 * Controllers keep reading `file.filename`, so the extension swap is reflected
 * back onto req.file rather than handled at each call site. Multer writes to
 * disk first (instead of memoryStorage) to keep a burst of 50MB uploads from
 * sitting in memory all at once.
 */
export async function compressUpload(req: Request, _res: Response, next: NextFunction): Promise<void> {
  // Everything is inside compressFile's catch on purpose: Express 4 does not
  // handle a rejected promise from async middleware, so anything thrown here
  // would hang the request with no response at all rather than surface an error.
  if (req.file) await compressFile(req.file);
  next();
}

/** Same as compressUpload, for routes that accept several files at once. */
export async function compressUploads(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const files = Array.isArray(req.files) ? req.files : [];
  for (const file of files) {
    await compressFile(file);
  }
  next();
}

async function compressFile(file: Express.Multer.File): Promise<void> {
  if (PASSTHROUGH_MIME.includes(file.mimetype)) return;

  const webpName = `${path.parse(file.filename).name}.webp`;
  const webpPath = path.join(file.destination, webpName);

  try {
    await compressToWebp(file.path, webpPath);
    // Read the size before touching anything, so a failure here still leaves
    // the original file and req.file untouched.
    const size = fs.statSync(webpPath).size;
    fs.unlinkSync(file.path);
    file.filename = webpName;
    file.path = webpPath;
    file.mimetype = 'image/webp';
    file.size = size;
  } catch (err) {
    // Leave the original in place: a photo served heavy beats a failed upload.
    console.error('Could not compress upload, keeping the original:', err);
    if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);
  }
}
