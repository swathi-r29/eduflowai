import React, { useState, useMemo } from 'react';
import { HelpCircle, CheckCircle2, XCircle, Award, RotateCw, FileText, Check, Sparkles, AlertCircle } from 'lucide-react';
import { QuizQuestion, parseQuizContent } from '../../utils/quizParser';
import MarkdownRenderer from './MarkdownRenderer';

import { useAuth } from '../../context/AuthContext';

interface InteractiveQuizViewerProps {
  rawContent?: string;
  questions?: QuizQuestion[];
  title?: string;
  onRetake?: () => void;
}

export default function InteractiveQuizViewer({
  rawContent = '',
  questions: passedQuestions,
  title = 'Interactive Practice Quiz',
  onRetake
}: InteractiveQuizViewerProps) {
  const { refreshUser } = useAuth();
  // Parse questions from rawContent if not directly passed
  const parsedQuestions = useMemo(() => {
    if (passedQuestions && passedQuestions.length > 0) return passedQuestions;
    return parseQuizContent(rawContent);
  }, [rawContent, passedQuestions]);

  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(() =>
    new Array(parsedQuestions.length).fill(-1)
  );
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);

  // Re-initialize answers array if questions change
  React.useEffect(() => {
    setSelectedAnswers(new Array(parsedQuestions.length).fill(-1));
    setIsSubmitted(false);
  }, [parsedQuestions]);

  // Calculate score
  const scoreResult = useMemo(() => {
    if (!isSubmitted || parsedQuestions.length === 0) return null;
    let correctCount = 0;
    parsedQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) {
        correctCount += 1;
      }
    });
    const percentage = Math.round((correctCount / parsedQuestions.length) * 100);
    return {
      correctCount,
      totalCount: parsedQuestions.length,
      percentage
    };
  }, [isSubmitted, selectedAnswers, parsedQuestions]);

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    if (isSubmitted) return; // Locked after submission
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[questionIdx] = optionIdx;
      return next;
    });
  };

  const handleSubmit = async () => {
    setIsSubmitted(true);
    await refreshUser();
  };

  const handleReset = () => {
    setSelectedAnswers(new Array(parsedQuestions.length).fill(-1));
    setIsSubmitted(false);
    if (onRetake) onRetake();
  };

  const isAllAnswered = selectedAnswers.every((a) => a !== -1);
  const answeredCount = selectedAnswers.filter((a) => a !== -1).length;

  // Fallback to MarkdownRenderer if parsing failed to yield questions
  if (parsedQuestions.length === 0 || showRawMarkdown) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-base-700 pb-2">
          <span className="text-xs font-semibold text-brand-violet flex items-center gap-1.5">
            <Sparkles size={14} /> Practice Quiz Content
          </span>
          {parsedQuestions.length > 0 && (
            <button
              onClick={() => setShowRawMarkdown(false)}
              className="text-xs bg-brand-indigo/20 text-brand-indigo hover:bg-brand-indigo/30 px-2.5 py-1 rounded font-medium border border-brand-indigo/30 transition-colors"
            >
              🎮 Switch to Interactive Quiz Mode
            </button>
          )}
        </div>
        <MarkdownRenderer content={rawContent} />
      </div>
    );
  }

  const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-base-800/90 p-3.5 rounded-xl border border-base-700">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-brand-indigo/20 text-brand-indigo">
            <HelpCircle size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
              {title}
            </h3>
            <p className="text-xs text-slate-400">
              {parsedQuestions.length} Questions • Select an answer for each question below
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setShowRawMarkdown(true)}
            className="text-[11px] bg-base-700 hover:bg-base-600 text-slate-300 px-2.5 py-1.5 rounded flex items-center gap-1 transition-colors"
            title="View raw markdown text"
          >
            <FileText size={12} /> Text View
          </button>
          {isSubmitted && (
            <button
              onClick={handleReset}
              className="text-[11px] bg-brand-indigo/20 hover:bg-brand-indigo/30 border border-brand-indigo/40 text-indigo-300 px-3 py-1.5 rounded font-medium flex items-center gap-1.5 transition-colors"
            >
              <RotateCw size={12} /> Retake Quiz
            </button>
          )}
        </div>
      </div>

      {/* Score Summary Header if Submitted */}
      {isSubmitted && scoreResult && (
        <div className="p-4 rounded-xl bg-base-800 border border-base-700 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg animate-fadeIn">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-full ${scoreResult.percentage >= 70
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
            >
              <Award size={28} />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Quiz Result</p>
              <h4 className="text-xl font-bold text-white">
                Score: {scoreResult.percentage}% ({scoreResult.correctCount} / {scoreResult.totalCount} Correct)
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {scoreResult.percentage >= 80
                  ? '🎉 Outstanding mastery of the video concepts!'
                  : scoreResult.percentage >= 60
                    ? '👍 Good understanding! Review missed questions below.'
                    : '💡 Practice makes perfect! Re-watch timestamped segments and retake.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="btn-primary text-xs px-4 py-2.5 flex items-center gap-2 shrink-0"
          >
            <RotateCw size={14} /> Retake Quiz
          </button>
        </div>
      )}

      {/* Question Cards */}
      <div className="space-y-6">
        {parsedQuestions.map((q, qIdx) => {
          const selectedOptIdx = selectedAnswers[qIdx];
          const isCorrect = selectedOptIdx === q.correctAnswerIndex;

          return (
            <div
              key={qIdx}
              className={`p-5 rounded-xl border transition-all ${isSubmitted
                  ? isCorrect
                    ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm'
                    : 'bg-red-950/20 border-red-500/40 shadow-sm'
                  : 'bg-base-900/80 border-base-700 hover:border-slate-600'
                }`}
            >
              {/* Question Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-2.5">
                  <span className="bg-brand-indigo/25 text-indigo-200 border border-brand-indigo/40 text-xs px-2.5 py-1 rounded-md font-bold font-mono shrink-0">
                    Q{qIdx + 1}
                  </span>
                  <h4 className="text-sm font-semibold text-slate-100 leading-relaxed pt-0.5">
                    {q.question}
                  </h4>
                </div>
                {q.targetConcept && (
                  <span className="text-[10px] bg-base-800 text-slate-400 border border-base-700 px-2 py-0.5 rounded shrink-0 hidden sm:inline-block">
                    {q.targetConcept}
                  </span>
                )}
              </div>

              {/* Options list */}
              <div className="space-y-2.5 pl-0 sm:pl-9">
                {q.options.map((optText, optIdx) => {
                  const isSelected = selectedOptIdx === optIdx;
                  const isAnswerKey = optIdx === q.correctAnswerIndex;

                  let optionStyle = 'border-base-700 bg-base-800/60 text-slate-300 hover:bg-base-800 hover:border-slate-500';
                  let badge = null;

                  if (isSubmitted) {
                    if (isSelected && isCorrect) {
                      // Student selected CORRECT answer -> GREEN BOX
                      optionStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-200 font-semibold shadow-md';
                      badge = (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/30 px-2 py-0.5 rounded font-medium border border-emerald-500/40 shrink-0">
                          <CheckCircle2 size={13} /> Your Answer (Correct)
                        </span>
                      );
                    } else if (isSelected && !isCorrect) {
                      // Student selected WRONG answer -> RED BOX
                      optionStyle = 'border-red-500 bg-red-500/20 text-red-200 font-semibold shadow-md';
                      badge = (
                        <span className="flex items-center gap-1 text-[11px] text-red-400 bg-red-500/30 px-2 py-0.5 rounded font-medium border border-red-500/40 shrink-0">
                          <XCircle size={13} /> Your Answer (Incorrect)
                        </span>
                      );
                    } else if (!isSelected && isAnswerKey) {
                      // Missed Correct Answer -> GREEN OUTLINE BOX
                      optionStyle = 'border-emerald-500/80 bg-emerald-500/10 text-emerald-300 font-medium';
                      badge = (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded font-medium border border-emerald-500/30 shrink-0">
                          <CheckCircle2 size={13} /> Correct Answer
                        </span>
                      );
                    } else {
                      // Unselected non-correct option
                      optionStyle = 'border-base-800 bg-base-900/40 text-slate-500 opacity-60';
                    }
                  } else if (isSelected) {
                    // Selected state before submit
                    optionStyle = 'border-brand-indigo bg-brand-indigo/25 text-indigo-100 font-medium shadow-sm';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={isSubmitted}
                      onClick={() => handleSelectOption(qIdx, optIdx)}
                      className={`w-full text-left flex items-center justify-between text-xs px-3.5 py-3 rounded-lg border transition-all ${isSubmitted ? 'cursor-default' : 'cursor-pointer'
                        } ${optionStyle}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold font-mono shrink-0 transition-colors ${isSelected
                              ? 'bg-brand-indigo text-white'
                              : 'bg-base-700/80 text-slate-300'
                            }`}
                        >
                          {optionLetters[optIdx] || optIdx + 1}
                        </span>
                        <span className="leading-relaxed">{optText}</span>
                      </div>
                      {badge}
                    </button>
                  );
                })}
              </div>

              {/* Detailed Explanation Box after submission */}
              {isSubmitted && (
                <div className="mt-4 ml-0 sm:ml-9 p-3.5 rounded-lg bg-base-800/90 border border-base-700 text-xs leading-relaxed space-y-1.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <CheckCircle2 size={14} /> Correct Answer:{' '}
                    <span className="text-white font-normal">
                      {optionLetters[q.correctAnswerIndex]}) {q.options[q.correctAnswerIndex]}
                    </span>
                  </div>
                  {q.explanation && (
                    <p className="text-slate-300 pl-5 text-[11.5px] leading-relaxed border-l-2 border-indigo-500/40 my-1">
                      {q.explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Submit Action Bar */}
      {!isSubmitted && (
        <div className="p-4 rounded-xl bg-base-800 border border-base-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {answeredCount === parsedQuestions.length ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Check size={14} /> All {parsedQuestions.length} questions answered! Ready to submit.
              </span>
            ) : (
              <span>
                Answered <strong className="text-white">{answeredCount}</strong> of{' '}
                <strong className="text-white">{parsedQuestions.length}</strong> questions
              </span>
            )}
          </p>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={answeredCount === 0}
            className={`btn-primary text-xs px-6 py-2.5 flex items-center gap-2 ${answeredCount === 0 ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-brand-indigo/20'
              }`}
          >
            <Sparkles size={14} /> Submit Quiz & Grade Answers
          </button>
        </div>
      )}
    </div>
  );
}
