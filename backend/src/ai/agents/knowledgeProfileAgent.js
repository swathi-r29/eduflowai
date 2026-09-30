import StudentKnowledgeProfile from '../../models/StudentKnowledgeProfile.js';

/**
 * Not an LLM agent — this deterministically updates the student's mastery
 * profile from AI-derived signals (rubric scores, root-cause categories,
 * quiz results). Keeping the arithmetic deterministic (rather than asking
 * an LLM to "update mastery") makes the numbers auditable and stable.
 */
export async function updateKnowledgeProfile({ studentId, conceptDeltas }) {
  let profile = await StudentKnowledgeProfile.findOne({ student: studentId });
  if (!profile) {
    profile = new StudentKnowledgeProfile({ student: studentId, concepts: [] });
  }

  for (const delta of conceptDeltas) {
    const existing = profile.concepts.find((c) => c.concept.toLowerCase() === delta.concept.toLowerCase());
    if (existing) {
      existing.attempts += 1;
      // Exponential moving average keeps mastery responsive but not jumpy.
      existing.masteryScore = Math.round(existing.masteryScore * 0.7 + delta.score * 0.3);
      existing.confidence = Math.min(1, existing.confidence + 0.05);
      if (delta.error) existing.commonErrors.push(delta.error);
      existing.lastUpdated = new Date();
    } else {
      profile.concepts.push({
        concept: delta.concept,
        masteryScore: delta.score,
        confidence: 0.3,
        commonErrors: delta.error ? [delta.error] : [],
        attempts: 1,
        lastUpdated: new Date()
      });
    }
  }

  await profile.save();
  return profile;
}

export function masteryToLevel(mastery) {
  if (mastery < 40) return 'Beginner';
  if (mastery < 70) return 'Intermediate';
  if (mastery < 85) return 'Advanced';
  return 'Challenge';
}
