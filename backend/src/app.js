import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { isDbConnected } from './config/db.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import classRoutes from './routes/classRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import submissionRoutes from './routes/submissionRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import studyRoutes from './routes/studyRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import progressRoutes from './routes/progressRoutes.js';
import userRoutes from './routes/userRoutes.js';

import path from 'path';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  app.use('/api', apiLimiter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', db: isDbConnected() ? 'connected' : 'disconnected', time: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/classes', classRoutes);
  app.use('/api/assignments', assignmentRoutes);
  app.use('/api/submissions', submissionRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/workspaces', workspaceRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/study', studyRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/users', userRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
