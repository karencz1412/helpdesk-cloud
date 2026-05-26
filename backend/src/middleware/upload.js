import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'text/plain'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Tipo de archivo no permitido'));
  }
});
