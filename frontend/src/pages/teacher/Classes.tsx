import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Plus, Trash2 } from 'lucide-react';
import type { RubricCriterion } from '../../types';

export default function Classes() {
  const [classes, setClasses] = useState<any[]>([]);
  const [creatingClass, setCreatingClass] = useState(false);
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [sampleSolution, setSampleSolution] = useState('');
  const [maxScore, setMaxScore] = useState(100);
  const [rubric, setRubric] = useState<RubricCriterion[]>([{ criterion: '', maxPoints: 25, description: '' }]);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/classes');
      const list = Array.isArray(res.data) ? res.data : (res.data?.classes || []);
      setClasses(list);
    } catch (e) {
      setClasses([]);
    }
  };
  useEffect(() => { load(); }, []);

  const createClass = async () => {
    if (!className.trim()) return;
    await api.post('/classes', { name: className, subject });
    setClassName(''); setSubject(''); setCreatingClass(false);
    load();
  };

  const [errorMsg, setErrorMsg] = useState('');

  const updateRubric = (i: number, field: keyof RubricCriterion, value: string | number) => {
    setRubric((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const createAssignment = async () => {
    setSavedMsg('');
    setErrorMsg('');
    if (!selectedClass) {
      setErrorMsg('Please select a class first.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please enter an assignment title.');
      return;
    }
    if (!question.trim()) {
      setErrorMsg('Please enter the question content.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/assignments', {
        classId: selectedClass, title, question, sampleSolution, maxScore,
        rubric: rubric.filter((r) => r.criterion.trim())
      });
      setSavedMsg('Assignment created successfully!');
      setTitle(''); setQuestion(''); setSampleSolution('');
      setRubric([{ criterion: '', maxPoints: 25, description: '' }]);
      load();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.response?.data?.error || 'Failed to create assignment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Classes</h1>
        <button className="btn-primary" onClick={() => setCreatingClass(true)}>New class</button>
      </div>

      {creatingClass && (
        <div className="card max-w-md">
          <label className="label">Class name</label>
          <input className="input-field mb-3" value={className} onChange={(e) => setClassName(e.target.value)} />
          <label className="label">Subject</label>
          <input className="input-field mb-3" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <button className="btn-secondary" onClick={() => setCreatingClass(false)}>Cancel</button>
            <button className="btn-primary" onClick={createClass}>Create</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((c) => (
          <div key={c._id} className="card hover:border-brand-indigo/50 transition-colors">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{c.name}</h3>
                <p className="text-xs text-slate-400">{c.subject || 'General'}</p>
                <p className="text-xs text-slate-500 mt-2">Join code: <span className="font-mono font-bold text-indigo-300">{c.joinCode}</span></p>
              </div>
              <Link to={`/teacher/classes/${c._id}`} className="btn-secondary text-xs">
                Manage Class
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="card w-full">
        <h2 className="font-semibold mb-4">Create assignment with rubric</h2>
        <label className="label">Class</label>
        <select className="input-field mb-3" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
          <option value="">Select a class</option>
          {classes.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <label className="label">Title</label>
        <input className="input-field mb-3" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="label">Question</label>
        <textarea className="input-field mb-3 h-24" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <label className="label">Sample solution (optional, helps grading accuracy)</label>
        <textarea className="input-field mb-3 h-20" value={sampleSolution} onChange={(e) => setSampleSolution(e.target.value)} />
        <label className="label">Max score</label>
        <input type="number" className="input-field mb-4 w-32" value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} />

        <label className="label">Rubric criteria</label>
        <div className="space-y-2 mb-3">
          {rubric.map((r, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input className="input-field" placeholder="Criterion" value={r.criterion} onChange={(e) => updateRubric(i, 'criterion', e.target.value)} />
              <input type="number" className="input-field w-24" placeholder="Points" value={r.maxPoints} onChange={(e) => updateRubric(i, 'maxPoints', Number(e.target.value))} />
              <button onClick={() => setRubric((prev) => prev.filter((_, idx) => idx !== i))}><Trash2 size={16} className="text-slate-500" /></button>
            </div>
          ))}
        </div>
        <button className="btn-secondary flex items-center gap-1 mb-4" onClick={() => setRubric((prev) => [...prev, { criterion: '', maxPoints: 10 }])}>
          <Plus size={14} /> Add criterion
        </button>

        <div>
          <button className="btn-primary" onClick={createAssignment} disabled={saving}>{saving ? 'Saving...' : 'Create assignment'}</button>
          {savedMsg && <span className="text-sm text-emerald-600 font-medium ml-3">{savedMsg}</span>}
          {errorMsg && <span className="text-sm text-red-600 font-medium ml-3">{errorMsg}</span>}
        </div>
      </div>
    </div>
  );
}
