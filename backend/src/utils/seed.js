/**
 * Optional demo seed: creates one teacher, one student, one class, and one
 * assignment with a rubric, so you have something to click through
 * immediately. It does NOT call any AI provider — grading only happens
 * when a real submission is created through the app with API keys set.
 *
 * Run with: npm run seed  (requires MONGODB_URI to be reachable)
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import User from '../models/User.js';
import ClassModel from '../models/ClassModel.js';
import Assignment from '../models/Assignment.js';
import { logger } from './logger.js';

async function seed() {
  await mongoose.connect(env.mongodbUri);

  const passwordHash = await bcrypt.hash('password123', 10);

  const teacher = await User.findOneAndUpdate(
    { email: 'teacher@eduflow.ai' },
    { name: 'Ms. Priya Rao', email: 'teacher@eduflow.ai', passwordHash, role: 'teacher' },
    { upsert: true, new: true }
  );

  const student = await User.findOneAndUpdate(
    { email: 'student@eduflow.ai' },
    { name: 'Arjun Kumar', email: 'student@eduflow.ai', passwordHash, role: 'student' },
    { upsert: true, new: true }
  );

  let cls = await ClassModel.findOne({ name: 'Java Programming - OOP', teacher: teacher._id });
  if (!cls) {
    cls = await ClassModel.create({
      name: 'Java Programming - OOP', subject: 'Computer Science', teacher: teacher._id,
      students: [student._id], joinCode: 'DEMO1234'
    });
  }

  const existing = await Assignment.findOne({ class: cls._id, title: 'Polymorphism Explained' });
  if (!existing) {
    await Assignment.create({
      class: cls._id,
      teacher: teacher._id,
      title: 'Polymorphism Explained',
      question: 'Explain runtime polymorphism in Java with an example, and describe how method overriding differs from method overloading.',
      sampleSolution: 'Runtime polymorphism occurs when a subclass overrides a method of its superclass, and the JVM decides at runtime which version to invoke based on the actual object type. Method overriding requires the same signature and is resolved at runtime; method overloading uses different signatures in the same class and is resolved at compile time.',
      rubric: [
        { criterion: 'Explains runtime polymorphism correctly', maxPoints: 40, description: 'Correct definition with reference to dynamic dispatch' },
        { criterion: 'Provides a valid code example', maxPoints: 30, description: 'Example demonstrates overriding, not overloading' },
        { criterion: 'Distinguishes overriding vs overloading', maxPoints: 30, description: 'Clear distinction between compile-time and runtime resolution' }
      ],
      maxScore: 100
    });
  }

  logger.info('Seed complete.');
  logger.info('Teacher login: teacher@eduflow.ai / password123');
  logger.info('Student login: student@eduflow.ai / password123');
  await mongoose.disconnect();
}

seed().catch((err) => {
  logger.error('Seed failed:', err.message);
  process.exit(1);
});
