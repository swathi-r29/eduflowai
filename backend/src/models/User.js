import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], required: true, default: 'student' },
  isActive: { type: Boolean, default: true },
  
  // Gamification fields
  xp: { type: Number, default: 0, min: 0 },
  level: { type: Number, default: 1, min: 1 },
  streak: { type: Number, default: 0, min: 0 },
  lastActiveDate: { type: Date, default: null },
  completedNodes: [{ type: String }]
}, { timestamps: true });

export default mongoose.model('User', userSchema);