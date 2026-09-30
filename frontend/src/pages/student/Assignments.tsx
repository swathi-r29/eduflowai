import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Assignment, Submission } from '../../types';
import VoiceInputButton from '../../components/common/VoiceInputButton';
import { Sparkles, Camera, Loader2, CheckCircle2, AlertTriangle, BookOpen } from 'lucide-react';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [active, setActive] = useState<Assignment | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pre-flight coach state
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightData, setPreflightData] = useState<any>(null);

  // OCR state
  const [ocrLoading, setOcrLoading] = useState(false);

  const load = () => {
    api.get('/assignments').then((r) => setAssignments(r.data.assignments));
    api.get('/submissions').then((r) => setSubmissions(r.data.submissions));
  };
  useEffect(load, []);

  const submissionFor = (assignmentId: string) =>
    submissions.find((s) => (typeof s.assignment === 'string' ? s.assignment : s.assignment._id) === assignmentId);

  const handleVoiceTranscript = (text: string) => {
    setAnswer((prev) => (prev ? `${prev} ${text}` : text));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !active) return;

    setOcrLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64Image = reader.result as string;
        const res = await api.post('/submissions/ocr', {
          assignmentId: active._id,
          imageInput: base64Image
        });

        if (res.data.ocrResult?.transcription) {
          setAnswer((prev) => (prev ? `${prev}\n\n${res.data.ocrResult.transcription}` : res.data.ocrResult.transcription));
        }
      } catch (err) {
        console.error('OCR transcription failed:', err);
        alert('Failed to transcribe handwritten image.');
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePreflightCheck = async () => {
    if (!active || !answer.trim()) return;
    setPreflightLoading(true);
    try {
      const res = await api.post('/submissions/preflight', {
        assignmentId: active._id,
        answerText: answer
      });
      setPreflightData(res.data.preflight);
    } catch (err) {
      console.error('Preflight check failed:', err);
    } finally {
      setPreflightLoading(false);
    }
  };

  const submit = async () => {
    if (!active) return;
    setSubmitting(true);
    try {
      await api.post('/submissions', { assignmentId: active._id, answerText: answer });
      setActive(null);
      setAnswer('');
      setPreflightData(null);
      setTimeout(load, 500);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Assignments</h1>
          <p className="text-slate-500 text-sm mt-1">Submit your code or theory answers for AI evaluation.</p>
        </div>
      </div>

      <div className="space-y-4">
        {assignments.map((a) => {
          const sub = submissionFor(a._id);
          return (
            <div key={a._id} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-base">{a.title}</h3>
                  <p className="text-sm text-slate-600 font-medium max-w-2xl leading-relaxed">{a.question}</p>
                  <p className="text-xs font-semibold text-slate-400 pt-1">Max score: {a.maxScore}</p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  {sub ? (
                    <div className="space-y-2">
                      <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        {sub.status.replace('_', ' ')}
                      </span>
                      <Link
                        to={`/student/submissions/${sub._id}`}
                        className="block text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        View AI feedback →
                      </Link>
                    </div>
                  ) : (
                    <button
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95"
                      onClick={() => {
                        setActive(a);
                        setAnswer('');
                        setPreflightData(null);
                      }}
                    >
                      Submit answer
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {assignments.length === 0 && <p className="text-slate-500 text-sm p-4">No assignments yet.</p>}
      </div>

      {/* Submission Modal */}
      {active && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-extrabold text-xl text-slate-900 dark:text-white tracking-tight">{active.title}</h3>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                {active.question}
              </p>
            </div>

            {/* Answer Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Answer Input Mode:
              </span>
              <div className="flex items-center gap-2.5">
                <VoiceInputButton onTranscript={handleVoiceTranscript} />

                <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-900 text-white shadow-sm cursor-pointer transition-all active:scale-95">
                  {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Camera className="w-4 h-4 text-slate-300" />}
                  <span>{ocrLoading ? 'Scanning...' : 'Photo OCR'}</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>

            {/* Textarea */}
            <div>
              <textarea
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm leading-relaxed focus:border-indigo-600 dark:focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-inner h-44 resize-y"
                placeholder="Write your answer here, click Voice Dictate to speak, or upload a photo of handwritten work..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
              />
            </div>

            {/* Pre-flight AI Coach Check */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <button
                type="button"
                onClick={handlePreflightCheck}
                disabled={preflightLoading || !answer.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-40"
              >
                {preflightLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-purple-200" />}
                <span>Run Pre-Flight AI Coach Check</span>
              </button>

              {preflightData && (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-800 dark:via-purple-950/40 dark:to-slate-800 border-2 border-indigo-200 dark:border-purple-800/60 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-purple-300">
                      Draft Readiness Score
                    </span>
                    <span className="px-3 py-1 rounded-full bg-indigo-600 text-white font-black text-sm shadow-sm">
                      {preflightData.readinessScore}%
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                    {preflightData.encouragingNote}
                  </p>

                  {preflightData.coveredCriteria?.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase tracking-wide">
                        ✓ Covered Criteria:
                      </span>
                      <ul className="text-xs text-slate-800 dark:text-slate-200 font-medium list-disc list-inside space-y-1 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-emerald-200/60">
                        {preflightData.coveredCriteria.map((c: string, i: number) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {preflightData.actionableHints?.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block uppercase tracking-wide">
                        💡 Hints to Improve Before Submitting:
                      </span>
                      <ul className="text-xs text-slate-800 dark:text-slate-200 font-medium list-disc list-inside space-y-1 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-amber-200/60">
                        {preflightData.actionableHints.map((h: string, i: number) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                onClick={() => setActive(null)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50"
                disabled={submitting || !answer.trim()}
                onClick={submit}
              >
                {submitting ? 'Submitting...' : 'Submit for AI grading'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
