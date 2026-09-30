import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  mongodbUri:
    process.env.MONGODB_URI ||
    'mongodb+srv://swathi29rd_db_user:eaUvTwAXcEoliatR@eduflow.bakocbc.mongodb.net/eduflow-ai?retryWrites=true&w=majority',
  redisUrl: process.env.REDIS_URL || '',
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: Number(process.env.REDIS_PORT || 6379),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004'
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929'
  },
  aiPrimaryProvider: process.env.AI_PRIMARY_PROVIDER || 'gemini',
  storagePath: process.env.STORAGE_PATH || './uploads',
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 200),
  vectorTopK: Number(process.env.VECTOR_TOP_K || 6)
};

export const config = {
  ...env,
  REDIS_URL: env.redisUrl,
  REDIS_HOST: env.redisHost,
  REDIS_PORT: env.redisPort
};