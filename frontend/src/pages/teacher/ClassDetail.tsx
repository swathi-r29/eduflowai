import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { ClassItem, Assignment } from '../../types';
import { Users, BookOpen, Copy, Check, Plus, Sparkles, ChevronRight } from 'lucide-react';

export default function TeacherClassDetail() {
  const { id } = useParams();
  const [cls, setCls] = useState<ClassItem | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // New assignment form state
  const [assignTitle, setAssignTitle] = useState('');
  const [assignQuestion, setAssignQuestion] = useState('');
  const [assignSampleSolution, setAssignSampleSolution] = useState('');
  const [assignMaxScore, setAssignMaxScore] = useState('100');
  const [creating, setCreating] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const clsRes = await api.get(`/classes/${id}`);
      const classObj = clsRes.data.class || clsRes.data;
      setCls(classObj);

      let assignList: Assignment[] = [];
      try {
        const assignRes = await api.get(`/assignments/class/${id}`);
        assignList = Array.isArray(assignRes.data) ? assignRes.data : (assignRes.data?.assignments || []);
      } catch (e) {
        try {
          const assignRes = await api.get(`/assignments?classId=${id}`);
          assignList = Array.isArray(assignRes.data) ? assignRes.data : (assignRes.data?.assignments || []);
        } catch (err) {}
      }
      setAssignments(assignList);

      // Fetch submissions for assignments in this class
      let subList: any[] = [];
      const validAssignments = assignList.filter((a) => a && (a._id || (a as any).id));
      if (validAssignments.length > 0) {
        try {
          const subPromises = validAssignments.map((a) => api.get(`/submissions/assignment/${a._id || (a as any).id}`));
          const subResponses = await Promise.allSettled(subPromises);
          subResponses.forEach((res) => {
            if (res.status === 'fulfilled' && res.value?.data) {
              const items = Array.isArray(res.value.data) ? res.value.data : (res.value.data.submissions || []);
              subList.push(...items);
            }
          });
        } catch (e) {}
      }
      setSubmissions(subList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const copyJoinCode = () => {
    if (cls?.joinCode) {
      navigator.clipboard.writeText(cls.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTitle || !assignQuestion) return;
    setCreating(true);
    try {
      await api.post('/assignments', {
        classId: id,
        title: assignTitle,
        question: assignQuestion,
        sampleSolution: assignSampleSolution,
        maxScore: Number(assignMaxScore) || 100,
        rubric: [
          { criterion: 'Concept Understanding', maxPoints: 40, description: 'Demonstrates clear grasp of core principles' },
          { criterion: 'Implementation / Reasoning', maxPoints: 40, description: 'Logical steps and complete solution' },
          { criterion: 'Clarity & Detail', maxPoints: 20, description: 'Clear presentation and terminology' }
        ]
      });
      setShowAssignModal(false);
      setAssignTitle('');
      setAssignQuestion('');
      setAssignSampleSolution('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  if (loading || !cls) {
    return <div className="py-12 text-center text-xs text-slate-500">Loading class details...</div>;
  }

  const students = (cls.students || (cls as any).studentIds || []) as any[];

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-1">Classroom Workspace</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{cls.name}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{cls.subject || 'General Subject'}</p>
        </div>

        <div className="flex items-center gap-3 bg-blue-50/80 px-4 py-2.5 rounded-2xl border border-blue-100">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Class Join Passcode</p>
            <p className="text-lg font-mono font-bold text-blue-600 tracking-widest">{cls.joinCode}</p>
          </div>
          <button onClick={copyJoinCode} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 font-bold">
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Grid: Overview / Students / Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Enrolled Students (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Users size={18} className="text-blue-600" /> Enrolled Students ({students.length})
              </h2>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {students.map((st, i) => (
                <div key={st._id || i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/90 border border-slate-200/70 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">{st.name || `Student ${i + 1}`}</p>
                    <p className="text-[11px] text-slate-500">{st.email || st.rollNo}</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full font-semibold text-[10px]">
                    Active
                  </span>
                </div>
              ))}
              {students.length === 0 && (
                <div className="text-center py-8 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    No students enrolled yet. Share passcode <strong className="font-mono text-blue-600">{cls.joinCode}</strong> with students.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Class AI Insights */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-3">
            <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Sparkles size={16} className="text-purple-600" /> Class AI Insights
            </h2>
            <div className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200/70 text-xs space-y-2 text-slate-700 font-medium">
              <p><strong>Class Size:</strong> {students.length} students enrolled</p>
              <p><strong>Total Assignments:</strong> {assignments.length}</p>
              <p><strong>Submissions Evaluated:</strong> {submissions.length}</p>
            </div>
          </div>
        </div>

        {/* Assignments List (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <BookOpen size={18} className="text-blue-600" /> Class Assignments ({assignments.length})
              </h2>
              <button onClick={() => setShowAssignModal(true)} className="btn-primary text-xs font-bold px-4 py-2 flex items-center gap-1 shadow-md shadow-blue-500/20">
                <Plus size={14} /> Create Assignment
              </button>
            </div>

            <div className="space-y-3">
              {assignments.map((a) => (
                <div key={a._id} className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/70 hover:border-blue-300 hover:bg-white transition-all space-y-2 shadow-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">{a.title}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{a.question}</p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-xl shrink-0">
                      Max {a.maxScore} pts
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                    <span>Rubric: {a.rubric?.length || 0} criteria</span>
                    <Link to="/teacher/submissions" className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                      Submissions & AI Grading &rarr;
                    </Link>
                  </div>
                </div>
              ))}
              {assignments.length === 0 && (
                <div className="text-center py-10 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No assignments created for this class yet. Click "Create Assignment" to post one.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl z-10">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Plus size={18} className="text-blue-600" /> Create New Assignment
            </h2>
            <form onSubmit={handleCreateAssignment} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Assignment Title</label>
                <input
                  required
                  className="w-full bg-[#EFF5FF] border border-blue-100 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="e.g. OOP Polymorphism & Method Overriding"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Question / Problem Prompt</label>
                <textarea
                  required
                  rows={3}
                  className="w-full bg-[#EFF5FF] border border-blue-100 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Explain runtime polymorphism in Java and give an example of method overriding..."
                  value={assignQuestion}
                  onChange={(e) => setAssignQuestion(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Sample Solution (for AI Grounded Grading)</label>
                <textarea
                  rows={2}
                  className="w-full bg-[#EFF5FF] border border-blue-100 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="Sample answer or key points expected in student submission..."
                  value={assignSampleSolution}
                  onChange={(e) => setAssignSampleSolution(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Max Score</label>
                <input
                  type="number"
                  className="w-32 bg-[#EFF5FF] border border-blue-100 rounded-2xl px-4 py-3 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                  value={assignMaxScore}
                  onChange={(e) => setAssignMaxScore(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" className="btn-secondary text-xs font-semibold py-2 px-4 rounded-xl" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs font-bold py-2 px-5 rounded-xl shadow-md shadow-blue-500/20" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

