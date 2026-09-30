import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env.js';

function makeStorage(subdir) {
  const dir = path.join(env.storagePath, subdir);
  fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      cb(null, safe);
    }
  });
}

export const uploadVideo = multer({
  storage: makeStorage('videos'),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['video/mp4', 'video/webm', 'video/quicktime'].includes(file.mimetype);
    cb(ok ? null : new Error('Unsupported video format. Use MP4, WebM or MOV.'), ok);
  }
});

export const uploadDocument = multer({
  storage: makeStorage('documents'),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    const isDocxExt = Boolean(file.originalname && file.originalname.toLowerCase().endsWith('.docx'));
    const ok = allowedTypes.includes(file.mimetype) || isDocxExt;
    cb(ok ? null : new Error('Unsupported document format. Use PDF, TXT or DOCX.'), ok);
  }
});
