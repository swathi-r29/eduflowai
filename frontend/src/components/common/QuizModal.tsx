import React from 'react';
import { X, Sparkles } from 'lucide-react';
import QuizPanel from './QuizPanel';
import { JourneyNodeItem } from './JourneyTree';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: JourneyNodeItem | null;
  misconception?: string;
  context?: string;
  onQuizComplete?: () => void;
}

export default function QuizModal({
  isOpen,
  onClose,
  node,
  misconception,
  context,
  onQuizComplete
}: QuizModalProps) {
  if (!isOpen || !node) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/95 backdrop-blur-xl overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-3xl my-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-white my-8">
        {/* Top Header Bar of Modal */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] uppercase tracking-wider font-extrabold text-cyan-400 block truncate">
                {node.type || 'Practice Node'}
              </span>
              <h3 className="text-base font-extrabold text-white leading-tight truncate">
                {node.title || node.concept}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full font-mono font-bold">
              +50 XP
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors border border-slate-700"
              title="Close quiz window"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Quiz Panel */}
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto space-y-6">
          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            {node.description || 'Complete the targeted practice quiz below to reinforce concept mastery and unlock the next node on your learning tree.'}
          </p>

          <QuizPanel
            key={node.id}
            targetConcept={node.concept || 'Concept Practice'}
            misconception={misconception}
            context={context}
            difficulty={node.difficulty || 'medium'}
            onQuizComplete={onQuizComplete}
          />
        </div>
      </div>
    </div>
  );
}
