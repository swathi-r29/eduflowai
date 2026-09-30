import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function TeacherSubmissions() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [grading, setGrading] = useState<any>(null);
  const [editScore, setEditScore] = useState<number>(0);
  const [editFeedback, setEditFeedback] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/submissions');
      const list = Array.isArray(res.data) ? res.data : (res.data?.submissions || []);
      setSubmissions(list);
    } catch (e) {
      setSubmissions([]);
    }
  };
  useEffect(() => { load(); }, []);

  const open = async (s: any) => {
    setSelected(s);
    const { data } = await api.get(`/submissions/${s._id}`);
    setGrading(data.gradingResult);
    if (data.gradingResult) {
      setEditScore(data.gradingResult.aiScore);
      setEditFeedback(data.gradingResult.feedback?.explanation || '');
    }
  };

  const calibrate = async (action: 'accept' | 'edit' | 'override') => {
    if (!grading) return;
    await api.post(`/submissions/grading/${grading._id}/calibrate`, { action, teacherScore: editScore, teacherFeedback: editFeedback });
    setSelected(null);
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Submissions to review</h1>
      <div className="space-y-2">
        {submissions.map((s) => (
          <button key={s._id} onClick={() => open(s)} className="card w-full text-left flex justify-between items-center hover:border-brand-indigo/50">
            <div>
              <p className="font-medium">{typeof s.assignment === 'object' ? s.assignment.title : 'Assignment'}</p>
              <p className="text-xs text-slate-500">Status: {s.status}</p>
            </div>
            <span className="text-xs text-brand-indigo">Review →</span>
          </button>
        ))}
        {submissions.length === 0 && <p className="text-slate-500">No submissions yet.</p>}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="card w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <h2 className="font-semibold mb-3">Student submission</h2>
            <p className="text-sm text-slate-300 mb-4 whitespace-pre-wrap">{selected.answerText}</p>

            {!grading ? (
              <p className="text-sm text-slate-500">AI evaluation not ready yet.</p>
            ) : (
              <>
                <div className="mb-4">
                  <p className="text-sm font-medium">AI Score: {grading.aiScore}/{grading.aiMaxScore} · Confidence {Math.round(grading.aiConfidence * 100)}%</p>
                  <p className="text-xs text-slate-500 mt-1">Root cause: {grading.rootCause.errorCategory.replaceAll('_', ' ')} — {grading.rootCause.detectedMisconception}</p>
                </div>
                <label className="label">Final score</label>
                <input type="number" className="input-field mb-3 w-32" value={editScore} onChange={(e) => setEditScore(Number(e.target.value))} />
                <label className="label">Final feedback</label>
                <textarea className="input-field mb-4 h-24" value={editFeedback} onChange={(e) => setEditFeedback(e.target.value)} />
                <div className="flex gap-2 justify-end">
                  <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
                  <button className="btn-secondary" onClick={() => calibrate('accept')}>Accept AI score</button>
                  <button className="btn-primary" onClick={() => calibrate('edit')}>Save edited grade</button>
                  <button className="btn-primary bg-amber-600" onClick={() => calibrate('override')}>Override</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
