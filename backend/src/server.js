import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`EduFlow AI backend listening on port ${env.port} (${env.nodeEnv})`);
    if (!process.env.GEMINI_API_KEY) logger.warn('GEMINI_API_KEY is not set - AI agent calls will fail until configured.');
    if (!process.env.ANTHROPIC_API_KEY) logger.warn('ANTHROPIC_API_KEY is not set - fallback provider unavailable until configured.');
  });
}

main().catch((err) => {
  logger.error('Fatal startup error:', err);
  process.exit(1);
});
