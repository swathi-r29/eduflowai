import React from 'react';
import { Sparkles, CheckCircle2, AlertCircle, X } from 'lucide-react';

export interface PreflightResult {
  readinessScore: number;
  coveredCriteria: string[];
  missingHints: string[];
}

interface PreflightModalProps {
  isOpen: boolean;
  onClose: () => void;
  preflightResult: PreflightResult | null;
  isChecking: boolean;
}

export default function PreflightModal({ isOpen, onClose, preflightResult, isChecking }: PreflightModalProps) {
  if (!isOpen) return null;

  const score = preflightResult?.readinessScore || 0;
  const covered = preflightResult?.coveredCriteria || [];
  const hints = preflightResult?.missingHints || [];

  const getBadgeColor = (s: number) => {
    if (s >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (s >= 50) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-rose-100 text-rose-800 border-rose-300';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 p-6 shadow-2xl rounded-3xl relative space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">AI Pre-Flight Readiness Check</h3>
              <p className="text-xs text-slate-500 font-medium">Instant Pre-Submission Rubric Feedback</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 font-bold p-1 rounded-lg hover:bg-slate-100 transition-all text-sm cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isChecking ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-xs font-bold text-slate-600 animate-pulse">
              Analyzing draft against rubric criteria...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Score Banner */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/70 rounded-2xl">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Estimated Draft Readiness
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-extrabold text-slate-900">{score}%</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getBadgeColor(score)}`}>
                    {score >= 80 ? 'Ready to Submit' : score >= 50 ? 'Needs Polish' : 'Needs Revision'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-semibold block">Covered Criteria</span>
                <span className="text-xl font-extrabold text-blue-600">{covered.length}</span>
              </div>
            </div>

            {/* Covered Criteria List */}
            {covered.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block">
                  ✅ Well-Addressed Rubric Areas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {covered.map((c, i) => (
                    <span key={i} className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg px-2.5 py-1 font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Hints List */}
            {hints.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 block">
                  💡 Actionable Suggestions Before Submitting
                </span>
                <ul className="space-y-2">
                  {hints.map((h, i) => (
                    <li key={i} className="text-xs text-slate-700 bg-amber-50/90 border border-amber-200 p-2.5 rounded-xl flex items-start gap-2 leading-relaxed">
                      <span className="text-amber-600 font-bold shrink-0">👉</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button onClick={onClose} className="btn-primary text-xs py-2.5 px-5 font-bold">
                Back to Editing Draft
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
