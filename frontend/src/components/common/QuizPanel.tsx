import React, { useState } from 'react';
import { api } from '../../api/client';

interface Question {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  targetConcept: string;
}

export default function QuizPanel({ targetConcept, misconception, context }: { targetConcept: string; misconception?: string; context?: string }) {
  const [attempt, setAttempt] = useState<{ _id: string; questions: Question[] } | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ score: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/generate-quiz', { targetConcept, misconception, context, count: 4 });
      setAttempt(data.quizAttempt);
      setAnswers(new Array(data.quizAttempt.questions.length).fill(-1));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!attempt) return;
    const { data } = await api.post(`/ai/quiz/${attempt._id}/submit`, { answers });
    setResult({ score: data.quizAttempt.score });
  };

  return (
    <div className="card">
      <h2 className="font-semibold mb-2">Targeted remediation quiz</h2>
      <p className="text-sm text-slate-400 mb-3">
        A short quiz generated specifically around <strong>{targetConcept}</strong>.
      </p>
      {!attempt && <button className="btn-primary" onClick={generate} disabled={loading}>{loading ? 'Generating...' : 'Generate quiz'}</button>}

      {attempt && (
        <div className="space-y-4 mt-2">
          {attempt.questions.map((q, qi) => (
            <div key={qi}>
              <p className="text-sm font-medium mb-2">{qi + 1}. {q.question}</p>
              <div className="space-y-1">
                {q.options.map((opt, oi) => (
                  <label key={oi} className={`block text-sm px-3 py-2 rounded-lg border cursor-pointer ${answers[qi] === oi ? 'border-brand-indigo bg-brand-indigo/10' : 'border-base-700'}`}>
                    <input
                      type="radio"
                      name={`q-${qi}`}
                      className="mr-2"
                      checked={answers[qi] === oi}
                      onChange={() => setAnswers((prev) => prev.map((v, i) => (i === qi ? oi : v)))}
                    />
                    {opt}
                  </label>
                ))}
              </div>
              {result && (
                <p className="text-xs text-slate-500 mt-1">
                  Correct answer: {q.options[q.correctAnswerIndex]} — {q.explanation}
                </p>
              )}
            </div>
          ))}
          {!result ? (
            <button className="btn-primary" onClick={submit} disabled={answers.includes(-1)}>Submit answers</button>
          ) : (
            <p className="text-lg font-semibold">Score: {result.score}%</p>
          )}
        </div>
      )}
    </div>
  );
}
