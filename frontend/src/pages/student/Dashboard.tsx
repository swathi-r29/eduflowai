import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { ClassItem } from '../../types';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { UserPlus, BookOpen, Sparkles, Flame, CheckCircle2 } from 'lucide-react';

import StreakCalendar from '../../components/common/StreakCalendar';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<any>(null);
  const [enrolledClasses, setEnrolledClasses] = useState<ClassItem[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    if (user) {
      try {
        let progData = null;
        try {
          const res = await api.get(`/progress/${user.id}`);
          progData = res.data;
        } catch (e) {
          try {
            const res = await api.get(`/analytics/student/${user.id}`);
            progData = res.data;
          } catch (err) {}
        }

        let classesList: ClassItem[] = [];
        let subResList: any[] = [];

        try {
          const classRes = await api.get('/classes');
          classesList = classRes.data.classes || classRes.data || [];
        } catch (e) {}

        try {
          const subRes = await api.get('/submissions');
          subResList = subRes.data.submissions || subRes.data || [];
        } catch (e) {}

        setProgress(progData);
        setEnrolledClasses(classesList);
        setSubmissions(subResList);
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    setJoinMsg(null);
    try {
      const { data } = await api.post('/classes/join', { joinCode: joinCode.trim() });
      setJoinMsg({ type: 'success', text: `Successfully joined ${data.class?.name || 'class'}!` });
      setJoinCode('');
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinMsg(null);
      }, 1500);
      loadData();
    } catch (err: any) {
      setJoinMsg({ type: 'error', text: err.response?.data?.message || err.response?.data?.error || 'Invalid join passcode.' });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-3 py-1 text-xs font-semibold mb-2">
            <BookOpen className="w-3.5 h-3.5" /> Enrolled Student Dashboard
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Here's where your AI learning progress stands.</p>
        </div>
        <button onClick={() => setShowJoinModal(true)} className="btn-primary text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20">
          <UserPlus size={16} /> Join Class
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">OVERALL MASTERY</p>
          <p className="text-4xl font-extrabold text-slate-900">{progress?.overallMastery ?? '—'}%</p>
          <p className="text-xs font-medium text-slate-500 mt-1">{progress?.overallLevel ?? 'No evaluation data yet'}</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">CONCEPTS TRACKED</p>
          <p className="text-4xl font-extrabold text-slate-900">{progress?.concepts?.length ?? 0}</p>
          <p className="text-xs font-medium text-slate-500 mt-1">Active prerequisite mapping</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col gap-2.5 justify-center">
          <Link to="/student/assignments" className="btn-primary text-center text-xs font-bold py-2.5 rounded-xl shadow-md shadow-blue-500/20">
            View Assignments
          </Link>
          <Link to="/student/workspaces" className="btn-secondary text-center text-xs font-semibold py-2.5 rounded-xl">
            Open Study Workspace
          </Link>
        </div>
      </div>

      {/* Gamified Activity Matrix & Streak Calendar */}
      <StreakCalendar streakCount={progress?.streakCount || (submissions.length > 0 ? 1 : 0)} submissions={submissions} />

      {/* Enrolled Classes section */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <BookOpen size={18} className="text-blue-600" /> Enrolled Classes ({enrolledClasses.length})
          </h2>
          <button onClick={() => setShowJoinModal(true)} className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold">
            + Join Class Passcode
          </button>
        </div>

        {enrolledClasses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {enrolledClasses.map((cls) => (
              <div key={cls._id} className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/70 hover:border-blue-300 hover:bg-white transition-all shadow-xs">
                <h3 className="font-bold text-sm text-slate-900">{cls.name}</h3>
                <p className="text-xs text-slate-500">{cls.subject || 'General Subject'}</p>
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-mono text-[11px]">Code: {cls.joinCode}</span>
                  <Link to="/student/assignments" className="text-blue-600 font-bold hover:underline">
                    Assignments &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              You have not joined any classes yet. Click "Join Class" and enter your teacher's 8-character passcode to enroll.
            </p>
          </div>
        )}
      </div>

      {/* Concept Mastery chart */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
          <Sparkles size={16} className="text-purple-600" /> AI Knowledge Profile & Concept Mastery
        </p>
        {progress?.concepts?.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={progress.concepts}>
              <XAxis dataKey="concept" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fill: '#64748b' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
              <Bar dataKey="masteryScore" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-xs text-slate-500 py-4">Complete an assignment or study quiz to start building your knowledge profile.</p>
        )}
      </div>

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl z-10">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserPlus size={18} className="text-blue-600" /> Join a Class
            </h2>
            <p className="text-xs text-slate-500">
              Enter the 8-character join passcode provided by your teacher to enroll in their class.
            </p>
            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Class Passcode</label>
                <input
                  required
                  autoFocus
                  className="w-full bg-[#EFF5FF] border border-blue-100 rounded-2xl px-4 py-3 text-center text-lg font-mono uppercase tracking-widest text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                  placeholder="e.g. DEMO1234"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
              </div>

              {joinMsg && (
                <p className={`text-xs p-3 rounded-2xl font-medium ${joinMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {joinMsg.text}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary text-xs font-semibold py-2 px-4 rounded-xl" onClick={() => setShowJoinModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs font-bold py-2 px-5 rounded-xl shadow-md shadow-blue-500/20" disabled={joining}>
                  {joining ? 'Joining...' : 'Join Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

