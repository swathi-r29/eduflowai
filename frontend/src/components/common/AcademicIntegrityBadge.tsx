import React from 'react';

const analyzeAcademicIntegrity = (answerText = '') => {
  if (!answerText) return { isAuthentic: true, score: 98, flagMessage: 'Authentic Human Work' };

  const text = answerText.toLowerCase();

  // AI-generated answer signatures
  const aiSignatures = [
    'as an ai',
    'in conclusion,',
    'furthermore,',
    'moreover,',
    'it is important to note',
    'delve into',
    'testament to',
    'tapestry of',
    'vital role in',
    'pivotal role',
  ];

  let aiMatches = 0;
  aiSignatures.forEach((phrase) => {
    if (text.includes(phrase)) aiMatches++;
  });

  const wordCount = text.split(/\s+/).length;
  const avgWordLength = text.length / (wordCount || 1);

  let authenticityScore = 95;
  if (aiMatches > 0) authenticityScore -= aiMatches * 18;
  if (wordCount > 150 && avgWordLength > 6.2) authenticityScore -= 12;

  authenticityScore = Math.max(25, Math.min(99, authenticityScore));
  const isAuthentic = authenticityScore >= 65;

  return {
    isAuthentic,
    score: authenticityScore,
    flagMessage: isAuthentic
      ? `${authenticityScore}% Authentic Student Response`
      : `⚠️ Potential AI-Generated Response (${100 - authenticityScore}% AI Similarity)`,
  };
};

interface AcademicIntegrityBadgeProps {
  answerText: string;
  className?: string;
}

export default function AcademicIntegrityBadge({ answerText, className = '' }: AcademicIntegrityBadgeProps) {
  const { isAuthentic, flagMessage } = analyzeAcademicIntegrity(answerText);

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs border ${
        isAuthentic
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
      } ${className}`}
      title="Academic Integrity & Authentic Reasoning Audit"
    >
      <span>{isAuthentic ? '🛡️' : '⚠️'}</span>
      <span>{flagMessage}</span>
    </div>
  );
}
