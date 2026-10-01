import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import User from '../models/User.js';

function sign(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) throw new ApiError(400, 'name, email and password are required');
  const allowedRoles = ['student', 'teacher']; // admin accounts are provisioned manually, not via public signup
  const finalRole = allowedRoles.includes(role) ? role : 'student';

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'An account with this email already exists');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: finalRole });
  const token = sign(user);
  res.status(201).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      xp: user.xp || 0,
      level: user.level || 1,
      streak: user.streak || 0,
      completedNodes: user.completedNodes || []
    }
  });
});

export const login = asyncHandler(async (req, res) => {
  const email = req.body.email || req.body.identifier || req.body.username;
  const { password, role } = req.body;
  if (!email || !password) throw new ApiError(400, 'email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new ApiError(401, 'Invalid email or password');

  if (role && user.role !== role) {
    throw new ApiError(401, `This account is registered as a ${user.role}. Please select the ${user.role} login tab.`);
  }

  if (!user.passwordHash) {
    throw new ApiError(401, 'Invalid email or password');
  }

  let ok = false;
  try {
    ok = await bcrypt.compare(password, user.passwordHash);
  } catch (err) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!ok) throw new ApiError(401, 'Invalid email or password');

  const token = sign(user);
  res.json({
    token,
    user: {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      xp: user.xp || 0,
      level: user.level || 1,
      streak: user.streak || 0,
      completedNodes: user.completedNodes || []
    }
  });
});

export const me = asyncHandler(async (req, res) => {
  const u = req.user;
  res.json({
    user: {
      id: u._id,
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      xp: u.xp || 0,
      level: u.level || 1,
      streak: u.streak || 0,
      completedNodes: u.completedNodes || []
    }
  });
});
