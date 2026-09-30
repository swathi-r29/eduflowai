import StudentKnowledgeProfile from '../../models/StudentKnowledgeProfile.js';
import LearningActivity from '../../models/LearningActivity.js';
import QuizAttempt from '../../models/QuizAttempt.js';

/**
 * Assembles the learning context agents need (spec section 27). This is
 * deliberately narrow: mastery per concept, recent mistakes, quiz history.
 * No unrelated personal data is pulled in.
 */
export async function getStudentContext(studentId) {
  const [profile, recentActivities, recentQuizzes] = await Promise.all([
    StudentKnowledgeProfile.findOne({ student: studentId }).lean(),
    LearningActivity.find({ student: studentId }).sort({ createdAt: -1 }).limit(20).lean(),
    QuizAttempt.find({ student: studentId, completedAt: { $ne: null } }).sort({ createdAt: -1 }).limit(10).lean()
  ]);

  return {
    knowledgeProfile: profile || { concepts: [] },
    recentMistakes: recentActivities.filter((a) => a.type === 'assignment' || a.type === 'quiz'),
    quizHistory: recentQuizzes.map((q) => ({ targetConcept: q.targetConcept, score: q.score, questionCount: q.questions.length }))
  };
}

export async function recordActivity({ studentId, type, concept, refId, detail }) {
  return LearningActivity.create({ student: studentId, type, concept, refId, detail });
}
