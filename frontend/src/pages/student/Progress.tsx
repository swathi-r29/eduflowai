import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

export default function Progress() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);

  useEffect(() => {
    if (user) api.get(`/analytics/student/${user.id}`).then((r) => setData(r.data));
  }, [user]);

  const genRoadmap = async () => {
    setLoadingRoadmap(true);
    try {
      const { data } = await api.post('/ai/generate-roadmap', {});
      setRoadmap(data.roadmap);
    } finally {
      setLoadingRoadmap(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Progress & knowledge profile</h1>

      <div className="card">
        <p className="label mb-3">Score trend across assignments</p>
        {data?.scoreTrend?.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.scoreTrend}>
              <CartesianGrid stroke="#1f1f33" />
              <XAxis dataKey="date" tick={false} />
              <YAxis tick={{ fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#161625', border: '1px solid #1f1f33' }} />
              <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-slate-500">No graded assignments yet.</p>}
      </div>

      <div className="card">
        <p className="label mb-3">Concept mastery</p>
        <div className="space-y-2">
          {data?.concepts?.map((c: any) => (
            <div key={c.concept}>
              <div className="flex justify-between text-sm mb-1">
                <span>{c.concept}</span>
                <span className="text-slate-400">{c.masteryScore}% · {c.level}</span>
              </div>
              <div className="h-2 bg-base-700 rounded overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-indigo to-brand-violet" style={{ width: `${c.masteryScore}%` }} />
              </div>
            </div>
          ))}
          {(!data?.concepts || data.concepts.length === 0) && <p className="text-sm text-slate-500">No concepts tracked yet.</p>}
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="label">Personalized learning roadmap</p>
          <button className="btn-primary" onClick={genRoadmap} disabled={loadingRoadmap}>
            {loadingRoadmap ? 'Generating...' : 'Generate roadmap'}
          </button>
        </div>
        {roadmap && (
          <div>
            <p className="text-sm text-slate-300 mb-2">{roadmap.summary}</p>
            <p className="text-xs text-slate-500 mb-3">Current level: {roadmap.currentLevel} · Gap: {roadmap.learningGap}</p>
            <ol className="space-y-2">
              {roadmap.steps.map((s: any) => (
                <li key={s.step} className="text-sm border-l-2 border-brand-indigo pl-3">
                  <p className="font-medium">{s.step}. {s.concept}</p>
                  <p className="text-slate-400 text-xs">{s.reason}</p>
                  <p className="text-slate-300 text-xs mt-0.5">Activity: {s.activity}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
