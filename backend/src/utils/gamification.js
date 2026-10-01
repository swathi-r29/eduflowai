import User from '../models/User.js';

const XP_MAP = {
  PREFLIGHT_CHECK: 15,
  PRACTICE_QUIZ: 50,
  ASSIGNMENT_SUBMISSION: 100,
  VIDEO_ANALYZED: 25
};

export async function awardUserXP(userId, actionType, nodeId = null) {
  if (!userId) return null;

  const user = await User.findById(userId);
  if (!user || user.role !== 'student') return user;

  const pointsToAdd = XP_MAP[actionType] || 10;
  user.xp = (user.xp || 0) + pointsToAdd;

  // Level computation: 150 XP per level
  user.level = Math.floor(user.xp / 150) + 1;

  // Streak calculation
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (!user.lastActiveDate) {
    user.streak = 1;
    user.lastActiveDate = today;
  } else {
    const lastActive = new Date(user.lastActiveDate);
    const lastActiveDay = new Date(lastActive.getFullYear(), lastActive.getMonth(), lastActive.getDate());
    const dayDiff = Math.round((today - lastActiveDay) / (1000 * 60 * 60 * 24));

    if (dayDiff === 1) {
      user.streak += 1;
      user.lastActiveDate = today;
    } else if (dayDiff > 1) {
      user.streak = 1;
      user.lastActiveDate = today;
    }
  }

  if (nodeId && !user.completedNodes.includes(nodeId)) {
    user.completedNodes.push(nodeId);
  }

  await user.save();
  return user;
}