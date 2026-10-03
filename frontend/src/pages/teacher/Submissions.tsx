import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { CheckCircle2, Clock, Sparkles, User, FileText, Search, ShieldCheck, ChevronRight, X, AlertCircle } from 'lucide-react';

export default function TeacherSubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [grading, setGrading] = useState<any>(null);
  const [editScore, setEditScore] = useState<number>(0);
  const [editFeedback, setEditFeedback] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [calibrating, setCalibrating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/submissions');
      const list = Array.isArray(res.data) ? res.data : (res.data?.submissions || []);
      setSubmissions(list);
    } catch (e) {
      console.error('Error loading submissions:', e);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const open = async (s: any) => {
    setSelected(s);
    setGrading(null);
    try {
      const { data } = await api.get(`/submissions/${s._id}`);
      setGrading(data.gradingResult);
      if (data.gradingResult) {
        setEditScore(data.gradingResult.teacherScore ?? data.gradingResult.aiScore);
        setEditFeedback(data.gradingResult.teacherFeedback ?? data.gradingResult.feedback?.explanation ?? '');
      }
    } catch (err) {
      console.error('Error loading submission detail:', err);
    }
  };

  const calibrate = async (action: 'accept' | 'edit' | 'override') => {
    if (!grading) return;
    setCalibrating(true);
    try {
      await api.post(`/submissions/grading/${grading._id}/calibrate`, {
        action,
        teacherScore: editScore,
        teacherFeedback: editFeedback
      });
      setSelected(null);
      load();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to update grade');
    } finally {
      setCalibrating(false);
    }
  };

  const filteredSubmissions = submissions.filter((s) => {
    const title = typeof s.assignment === 'object' && s.assignment ? s.assignment.title : 'Assignment';
    const studentName = s.studentName || s.student?.name || (s.rollNumber ? `Roll: ${s.rollNumber}` : 'Student');
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          studentName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'EVALUATED') return s.status === 'ai_evaluated' || s.status === 'teacher_reviewed';
    if (statusFilter === 'PENDING') return s.status === 'submitted' || s.status === 'pending' || s.status === 'ai_processing';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-3 py-1 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> AI Multi-Agent Grading System
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Student Submissions
          </h1>
          <p className="text-slate-500 text-sm mt-1">Review AI evaluation scores, inspect evidence, and calibrate grades.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl transition-all ${statusFilter === 'ALL' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            All ({submissions.length})
          </button>
          <button
            onClick={() => setStatusFilter('EVALUATED')}
            className={`px-3 py-1.5 rounded-xl transition-all ${statusFilter === 'EVALUATED' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Evaluated
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl transition-all ${statusFilter === 'PENDING' ? 'bg-white shadow text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Pending
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by student name, roll number, or assignment title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-slate-200/80 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
        />
      </div>

      {/* Submissions List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading submissions...</div>
        ) : filteredSubmissions.length > 0 ? (
          filteredSubmissions.map((s) => {
            const title = typeof s.assignment === 'object' && s.assignment ? s.assignment.title : 'Assignment';
            const studentName = s.studentName || s.student?.name || (s.rollNumber ? `Roll: ${s.rollNumber}` : 'Student');
            const dateStr = s.createdAt ? new Date(s.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently';

            return (
              <button
                key={s._id}
                onClick={() => open(s)}
                className="card w-full text-left flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:border-blue-400 transition-all group p-5 rounded-2xl border-slate-200/80"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{title}</span>
                    {s.isPublicSubmission && (
                      <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 font-semibold px-2 py-0.5 rounded-full">
                        Public Portal
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1 text-slate-700 font-semibold">
                      <User size={13} className="text-blue-600" /> {studentName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock size={13} /> {dateStr}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {s.status === 'ai_evaluated' || s.status === 'teacher_reviewed' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                      <CheckCircle2 size={13} /> Evaluated
                    </span>
                  ) : s.status === 'ai_processing' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full animate-pulse">
                      <Sparkles size={13} /> AI Processing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                      <Clock size={13} /> Submitted
                    </span>
                  )}
                  <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Review <ChevronRight size={14} />
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-bold text-slate-700">No submissions found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Submissions will appear here once students submit their assignments via student dashboard or public portal.
            </p>
          </div>
        )}
      </div>

      {/* Evaluation & Calibration Modal */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Student Submission Review</span>
                <h2 className="text-lg font-extrabold text-slate-900">
                  {typeof selected.assignment === 'object' && selected.assignment ? selected.assignment.title : 'Assignment Submission'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submitted by: <strong>{selected.studentName || selected.student?.name || (selected.rollNumber ? `Roll: ${selected.rollNumber}` : 'Student')}</strong>
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            {/* Answer Content */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Student Answer Text</label>
              <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-800">
                {selected.answerText}
              </div>
            </div>

            {/* AI Grading Results */}
            {!grading ? (
              <div className="py-8 text-center space-y-2 bg-blue-50/50 rounded-2xl border border-blue-100">
                <Sparkles className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-blue-900">AI evaluation is in progress...</p>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">AI Evaluated Score</p>
                      <p className="text-2xl font-extrabold text-blue-600">
                        {grading.aiScore} / {grading.aiMaxScore || 100}
                        <span className="text-xs font-semibold text-slate-500 ml-2">
                          ({Math.round((grading.aiConfidence || 0.94) * 100)}% Confidence)
                        </span>
                      </p>
                    </div>

                    {grading.teacherStatus !== 'pending' && (
                      <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-xl font-bold font-mono">
                        Teacher Status: {grading.teacherStatus?.toUpperCase()} ({grading.teacherScore} pts)
                      </span>
                    )}
                  </div>

                  {grading.rootCause?.detectedMisconception && (
                    <div className="text-xs bg-amber-50 text-amber-900 p-3 rounded-xl border border-amber-200 font-medium">
                      <strong>Detected Misconception:</strong> {grading.rootCause.detectedMisconception}
                    </div>
                  )}
                </div>

                {/* Rubric Criteria Breakdown */}
                {grading.rubricEvaluation?.criteriaScores?.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Rubric Criteria Breakdown</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {grading.rubricEvaluation.criteriaScores.map((c: any, idx: number) => (
                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex justify-between items-start">
                          <div>
                            <p className="font-bold text-slate-800">{c.criterion}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">{c.reasoning}</p>
                          </div>
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shrink-0">
                            {c.score}/{c.maxPoints} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Teacher Calibration Form */}
                <div className="bg-white border border-blue-200/80 rounded-2xl p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 flex items-center gap-1.5">
                    <ShieldCheck size={16} /> Teacher Grade Calibration & Feedback
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">Final Teacher Score</label>
                      <input
                        type="number"
                        className="w-full bg-[#EFF5FF] border border-blue-100 rounded-xl px-3.5 py-2 text-sm text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                        value={editScore}
                        onChange={(e) => setEditScore(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Teacher Feedback / Explanation</label>
                    <textarea
                      rows={3}
                      className="w-full bg-[#EFF5FF] border border-blue-100 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                      value={editFeedback}
                      onChange={(e) => setEditFeedback(e.target.value)}
                      placeholder="Add custom notes or instructions for the student..."
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-slate-100">
                    <button type="button" className="btn-secondary text-xs font-semibold py-2 px-3 rounded-xl" onClick={() => setSelected(null)}>
                      Close
                    </button>
                    <button type="button" className="btn-secondary text-xs font-bold py-2 px-3 rounded-xl text-blue-700 border-blue-200" onClick={() => calibrate('accept')} disabled={calibrating}>
                      Accept AI Score
                    </button>
                    <button type="button" className="btn-primary text-xs font-bold py-2 px-4 rounded-xl shadow-md shadow-blue-500/20" onClick={() => calibrate('edit')} disabled={calibrating}>
                      Save Edited Grade
                    </button>
                    <button type="button" className="btn-primary bg-amber-600 hover:bg-amber-700 text-xs font-bold py-2 px-4 rounded-xl" onClick={() => calibrate('override')} disabled={calibrating}>
                      Override Grade
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

