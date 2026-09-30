import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import ClassModel from '../models/ClassModel.js';
import { v4 as uuidv4 } from 'uuid';

export const createClass = asyncHandler(async (req, res) => {
  const { name, subject } = req.body;
  if (!name) throw new ApiError(400, 'name is required');
  const cls = await ClassModel.create({ name, subject, teacher: req.user._id, joinCode: uuidv4().slice(0, 8) });
  res.status(201).json({ class: cls });
});

export const listClasses = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'teacher' ? { teacher: req.user._id } : { students: req.user._id };
  const classes = await ClassModel.find(filter).populate('teacher', 'name email');
  res.json({ classes });
});

export const joinClass = asyncHandler(async (req, res) => {
  const { joinCode } = req.body;
  const cls = await ClassModel.findOne({ joinCode });
  if (!cls) throw new ApiError(404, 'Invalid join code');
  if (!cls.students.includes(req.user._id)) {
    cls.students.push(req.user._id);
    await cls.save();
  }
  res.json({ class: cls });
});

export const getClass = asyncHandler(async (req, res) => {
  const cls = await ClassModel.findById(req.params.id).populate('students', 'name email').populate('teacher', 'name email');
  if (!cls) throw new ApiError(404, 'Class not found');

  const userIdStr = String(req.user._id);
  const isTeacher = req.user.role === 'teacher' && String(cls.teacher?._id || cls.teacher) === userIdStr;
  const isStudent = req.user.role === 'student' && cls.students.some((s) => String(s._id || s) === userIdStr);
  const isAdmin = req.user.role === 'admin';

  if (!isTeacher && !isStudent && !isAdmin) {
    throw new ApiError(403, 'Forbidden: You do not have access to this class');
  }

  res.json({ class: cls });
});
