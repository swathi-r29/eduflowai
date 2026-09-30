import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export async function connectDB() {
  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    logger.info(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (err) {
    isConnected = false;
    logger.error(`MongoDB connection failed: ${err.message}`);
    logger.warn('Server continuing in LIMITED MODE (no database). Set MONGODB_URI and restart to enable data features.');
  }
}

export function isDbConnected() {
  return isConnected;
}
