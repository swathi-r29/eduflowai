import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle2, XCircle, Award, RotateCw, HelpCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface Question {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  targetConcept: string;
  studentAnswerIndex?: number | null;
}

export default function QuizPanel({
  targetConcept,
  misconception,
  context,
  difficulty = 'medium',
  onQuizComplete
}: {
  targetConcept: string;
  misconception?: string;
  context?: string;
  difficulty?: string;
  onQuizComplete?: () => void;
}) {
  const { refreshUser } = useAuth();
  const [attempt, setAttempt] = useState<{ _id: string; score?: number | null; completedAt?: string | null; questions: Question[] } | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<{ score: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchExistingOrGenerate = async () => {
      if (!targetConcept) return;
      setLoading(true);
      try {
        const { data } = await api.post('/ai/generate-quiz', { targetConcept, misconception, context, difficulty, count: 4 });
        if (!isMounted) return;

        if (data.quizAttempt) {
          setAttempt(data.quizAttempt);
          const initialAnswers = data.quizAttempt.questions.map((q: any) =>
            typeof q.studentAnswerIndex === 'number' && q.studentAnswerIndex >= 0 ? q.studentAnswerIndex : -1
          );
          setAnswers(initialAnswers);

          if (data.alreadyCompleted || data.quizAttempt.completedAt != null || typeof data.quizAttempt.score === 'number') {
            setResult({ score: data.quizAttempt.score ?? 0 });
            setAlreadyCompleted(true);
          } else {
            setResult(null);
            setAlreadyCompleted(false);
          }
        }
      } catch (err) {
        console.error('Failed to load quiz attempt:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchExistingOrGenerate();
    return () => { isMounted = false; };
  }, [targetConcept, difficulty]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/ai/generate-quiz', { targetConcept, misconception, context, difficulty, count: 4 });
      setAttempt(data.quizAttempt);
      const initialAnswers = data.quizAttempt.questions.map((q: any) =>
        typeof q.studentAnswerIndex === 'number' && q.studentAnswerIndex >= 0 ? q.studentAnswerIndex : -1
      );
      setAnswers(initialAnswers);
      if (data.alreadyCompleted || data.quizAttempt.completedAt != null || typeof data.quizAttempt.score === 'number') {
        setResult({ score: data.quizAttempt.score ?? 0 });
        setAlreadyCompleted(true);
      } else {
        setResult(null);
        setAlreadyCompleted(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!attempt || alreadyCompleted) return;
    const { data } = await api.post(`/ai/quiz/${attempt._id}/submit`, { answers });
    setResult({ score: data.quizAttempt.score });
    setAlreadyCompleted(true);
    await refreshUser();
    if (onQuizComplete) {
      onQuizComplete();
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <HelpCircle size={22} />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
              Targeted Remediation Practice
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Practice questions tailored to <strong className="text-cyan-300 font-semibold">{targetConcept}</strong>
            </p>
          </div>
        </div>

        {attempt && (
          <span className="text-xs bg-slate-800 text-cyan-400 px-3 py-1 rounded-full border border-slate-700 font-mono font-bold self-start sm:self-center">
            {attempt.questions.length} Questions • {difficulty.toUpperCase()}
          </span>
        )}
      </div>

      {loading && !attempt && (
        <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
          <Sparkles size={24} className="animate-spin text-cyan-400" />
          <p className="font-semibold text-slate-300">Generating AI Practice Quiz...</p>
        </div>
      )}

      {!attempt && !loading && (
        <button
          onClick={generate}
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-extrabold text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Sparkles size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Generating Quiz...' : 'Generate Practice Quiz'}
        </button>
      )}

      {attempt && (
        <div className="space-y-6">
          {alreadyCompleted && result && (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between gap-3 text-xs shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-extrabold">
                  ✓
                </div>
                <div>
                  <p className="font-bold text-white text-sm">Quiz Mastered!</p>
                  <p className="text-slate-300 mt-0.5">Your Score: <strong className="text-emerald-400 font-bold">{result.score}%</strong> • Earned +50 XP</p>
                </div>
              </div>
              <span className="text-[11px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700 font-mono">
                ✓ Completed
              </span>
            </div>
          )}

          {/* Question Cards */}
          {attempt.questions.map((q, qi) => (
            <div key={qi} className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4 shadow-md">
              <div className="flex items-start gap-3">
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-1 rounded-lg font-mono font-bold shrink-0">
                  Q{qi + 1}
                </span>
                <p className="text-sm font-bold text-slate-100 leading-relaxed pt-0.5">
                  {q.question}
                </p>
              </div>

              {/* Options */}
              <div className="space-y-2.5 pl-0 sm:pl-9">
                {q.options.map((opt, oi) => {
                  const isSelected = answers[qi] === oi;
                  const isCorrect = oi === q.correctAnswerIndex;
                  const isSubmitted = result !== null;

                  let styleClasses = 'border-slate-800 bg-slate-800/40 text-slate-200 hover:border-cyan-500/60 hover:bg-slate-800';
                  let statusBadge = null;

                  if (isSubmitted) {
                    if (isSelected && isCorrect) {
                      styleClasses = 'border-emerald-500 bg-emerald-500/20 text-emerald-200 font-semibold shadow-md';
                      statusBadge = (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/30 px-2.5 py-1 rounded-lg font-bold border border-emerald-500/40">
                          <CheckCircle2 size={14} /> Correct
                        </span>
                      );
                    } else if (isSelected && !isCorrect) {
                      styleClasses = 'border-rose-500 bg-rose-500/20 text-rose-200 font-semibold shadow-md';
                      statusBadge = (
                        <span className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/30 px-2.5 py-1 rounded-lg font-bold border border-rose-500/40">
                          <XCircle size={14} /> Incorrect
                        </span>
                      );
                    } else if (!isSelected && isCorrect) {
                      styleClasses = 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300 font-medium';
                      statusBadge = (
                        <span className="flex items-center gap-1 text-xs text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-lg font-medium border border-emerald-500/30">
                          <CheckCircle2 size={14} /> Correct Answer
                        </span>
                      );
                    } else {
                      styleClasses = 'border-slate-800/60 bg-slate-900/40 text-slate-500 opacity-50';
                    }
                  } else if (isSelected) {
                    styleClasses = 'border-indigo-500 bg-indigo-600/30 text-white font-semibold shadow-md';
                  }

                  return (
                    <label
                      key={oi}
                      className={`flex items-center justify-between text-xs px-4 py-3 rounded-xl border transition-all ${
                        isSubmitted ? 'cursor-default' : 'cursor-pointer'
                      } ${styleClasses}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <input
                          type="radio"
                          disabled={isSubmitted}
                          name={`q-${qi}`}
                          className="accent-indigo-500 cursor-pointer w-4 h-4"
                          checked={isSelected}
                          onChange={() => setAnswers((prev) => prev.map((v, i) => (i === qi ? oi : v)))}
                        />
                        <span className="leading-relaxed">{opt}</span>
                      </div>
                      {statusBadge}
                    </label>
                  );
                })}
              </div>

              {/* Detailed Explanation */}
              {result && (
                <div className="mt-3 ml-0 sm:ml-9 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs leading-relaxed space-y-1.5 animate-fadeIn">
                  <p className="font-bold text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 size={15} /> Correct Answer: <span className="text-white font-normal">{q.options[q.correctAnswerIndex]}</span>
                  </p>
                  <p className="text-slate-300 pl-6 text-[12px] border-l-2 border-indigo-500/40 my-1 leading-relaxed">
                    {q.explanation}
                  </p>
                </div>
              )}
            </div>
          ))}

          {/* Submit Action */}
          {!result ? (
            <button
              className={`w-full text-xs font-extrabold uppercase tracking-wider py-4 rounded-xl transition-all shadow-lg ${
                answers.includes(-1)
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-500/25 hover:scale-[1.01]'
              }`}
              onClick={submit}
              disabled={answers.includes(-1)}
            >
              Submit Quiz Answers & Claim XP
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-slate-950 border border-slate-800 mt-6">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-2xl ${
                    result.score >= 75
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  <Award size={26} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Quiz Completed</p>
                  <p className="text-xl font-extrabold text-white">Score: {result.score}%</p>
                </div>
              </div>
              <button
                className="btn-secondary text-xs px-4 py-2.5 flex items-center gap-2"
                onClick={generate}
              >
                <RotateCw size={14} /> Review Questions
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
