import React from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Sparkles, Trophy, CheckCircle } from 'lucide-react';
import QuizPanel from '../../components/common/QuizPanel';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

export default function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();

  // Extract query or location state parameters
  const state = location.state || {};
  const concept = searchParams.get('concept') || state.concept || 'Programming Logic';
  const title = searchParams.get('title') || state.title || concept;
  const difficulty = (searchParams.get('difficulty') || state.difficulty || 'medium') as 'easy' | 'medium' | 'hard' | 'expert';
  const misconception = searchParams.get('misconception') || state.misconception;
  const context = searchParams.get('context') || state.context;
  const nodeId = searchParams.get('nodeId') || state.nodeId;
  const returnUrl = searchParams.get('returnUrl') || state.returnUrl || '/student/progress';
  const nodeType = searchParams.get('type') || state.type || `Node • ${difficulty.toUpperCase()}`;

  const [completed, setCompleted] = React.useState(false);

  const handleQuizComplete = async () => {
    setCompleted(true);
    await refreshUser();
    if (nodeId) {
      try {
        await api.post('/submissions/journey/complete-node', { nodeId });
        await refreshUser();
      } catch (err) {
        console.error('Failed to complete node on backend:', err);
      }
    }
  };

  const difficultyColors = {
    easy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    medium: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    hard: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    expert: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  }[difficulty];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header Navigation Bar */}
      <div className="flex items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          onClick={() => navigate(returnUrl)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Back to Skill Tree</span>
        </button>

        <div className="flex items-center gap-3">
          <span className={`text-[11px] uppercase tracking-wider font-extrabold px-3 py-1 rounded-full border ${difficultyColors}`}>
            {nodeType}
          </span>
          <span className="hidden md:inline text-xs font-bold text-slate-500">
            Remediation Practice Mode
          </span>
        </div>
      </div>

      {/* Challenge Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-start justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <span className="text-xs font-extrabold text-cyan-400 uppercase tracking-wider">Targeted Practice Node</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Complete the interactive questions below to master <strong className="text-cyan-300 font-semibold">{concept}</strong> and unlock the next node on your learning path.
            </p>
          </div>

          <div className="shrink-0 hidden sm:flex flex-col items-end">
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3.5 py-1.5 rounded-full font-mono font-bold flex items-center gap-1.5 shadow-inner">
              <Trophy size={15} /> +50 XP
            </span>
          </div>
        </div>
      </div>

      {/* Completion Banner */}
      {completed && (
        <div className="bg-emerald-950/90 border border-emerald-500/40 rounded-3xl p-6 text-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl animate-fadeIn">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle size={28} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Node Mastered! +50 XP Awarded</h3>
              <p className="text-xs text-emerald-300/90 mt-0.5">
                Awesome effort! You've unlocked the next node on your learning journey.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(returnUrl)}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs transition shadow-lg cursor-pointer shrink-0"
          >
            Continue Learning Path →
          </button>
        </div>
      )}

      {/* Quiz Panel Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-white">
        <QuizPanel
          key={`${concept}-${difficulty}`}
          targetConcept={concept}
          misconception={misconception}
          context={context}
          difficulty={difficulty}
          onQuizComplete={handleQuizComplete}
        />
      </div>
    </div>
  );
}
