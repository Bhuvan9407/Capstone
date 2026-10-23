import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config/index.js';
import { fail } from '../utils/core.js';

const localUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(config.uploads.dir, { recursive: true });
      cb(null, config.uploads.dir);
    },
    filename: (_req, file, cb) => {
      // Never trust the caller-supplied filename in storage.
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname || '').slice(0, 8)}`);
    },
  }),
  limits: { fileSize: config.uploads.maxSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!config.uploads.allowedMime.includes(file.mimetype)) {
      return cb(Object.assign(new Error('Unsupported file type'), { status: 415, code: 'UNSUPPORTED_MEDIA' }));
    }
    cb(null, true);
  },
});

export const uploadMw = (field = 'file') => {
  const mw = localUpload.single(field);
  return (req, res, next) =>
    mw(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(fail(413, `File exceeds the ${config.uploads.maxSizeMb}MB limit`));
      }
      return next(Object.assign(err, err.status ? err : { status: 400 }));
    });
};

export const readFileText = (storageKey) =>
  fs.readFileSync(path.join(config.uploads.dir, path.basename(storageKey)), { encoding: 'utf8' }).toString();

// pdf-parse pulls a debug file in some environments when required at top level;
// lazy-load it inside the function instead.
export const readPdfText = async (storageKey) => {
  const mod = await import('pdf-parse');
  const pdfParse = mod.default;
  const buf = fs.readFileSync(path.join(config.uploads.dir, path.basename(storageKey)));
  const data = await pdfParse(buf);
  return {
    text: data.text || '',
    pages: Array.isArray(data.text) ? data.text.length : (data.numpages || 1),
  };
};

export const removeFile = (storageKey) => {
  try {
    fs.unlinkSync(path.join(config.uploads.dir, path.basename(storageKey)));
  } catch {
    /* already gone */
  }
};

export const fileChecksum = (storageKey) => {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(path.join(config.uploads.dir, path.basename(storageKey))));
  return hash.digest('hex');
};

/** Sniff magic bytes to make sure the declared MIME matches the real content. */
export const sniffType = (storageKey) => {
  const fd = fs.openSync(path.join(config.uploads.dir, path.basename(storageKey)), 'r');
  const buf = Buffer.alloc(8);
  fs.readSync(fd, buf, 0, 8, 0);
  fs.closeSync(fd);
  if (buf.toString('hex', 0, 4) === '25504446') return 'application/pdf';
  if (buf.includes(0)) return 'unknown/binary';
  return 'text/plain';
};
