import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import JourneyTree, { JourneyNodeItem } from '../../components/common/JourneyTree';
import QuizPanel from '../../components/common/QuizPanel';
import QuizModal from '../../components/common/QuizModal';
import { Sparkles } from 'lucide-react';

export default function Progress() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [selectedNode, setSelectedNode] = useState<JourneyNodeItem | null>(null);
  const [completingNode, setCompletingNode] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);

  const handleSelectNode = (node: JourneyNodeItem) => {
    const params = new URLSearchParams({
      concept: node.concept || node.title || '',
      title: node.title || '',
      difficulty: node.difficulty || 'medium',
      nodeId: node.id || '',
      type: node.type || '',
      returnUrl: '/student/progress'
    });
    navigate(`/student/quiz?${params.toString()}`);
  };

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

  const handleCompleteNode = async (nodeId: string) => {
    if (!nodeId) return;
    setCompletingNode(true);
    try {
      await api.post('/submissions/journey/complete-node', { nodeId });
      await refreshUser();
      if (roadmap) {
        const items = roadmap.actionItems || roadmap.steps || [];
        const currentIdx = items.findIndex((n: any) => n.id === nodeId || `node-step-${n.step}` === nodeId);
        if (currentIdx !== -1 && currentIdx + 1 < items.length) {
          const nextItem = items[currentIdx + 1];
          const nextNodeId = nextItem.id || `node-step-${nextItem.step || currentIdx + 2}`;
          setSelectedNode({
            id: nextNodeId,
            type: 'Skill Node',
            title: nextItem.concept || nextItem.title,
            concept: nextItem.concept || nextItem.title,
            description: nextItem.description || `${nextItem.reason} - ${nextItem.activity}`,
            remediationFocus: nextItem.remediationFocus || nextItem.activity
          });
        } else if (selectedNode) {
          setSelectedNode({ ...selectedNode, completed: true });
        }
      }
    } catch (err) {
      console.error('Failed to complete node:', err);
    } finally {
      setCompletingNode(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Progress & Knowledge Profile</h1>

      <div className="card">
        <p className="label mb-3">Score trend across assignments</p>
        {data?.scoreTrend?.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.scoreTrend}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={false} />
              <YAxis tick={{ fill: '#64748b' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px' }} />
              <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: '#2563eb', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-500 py-4">No graded assignments yet.</p>
        )}
      </div>

      <div className="card">
        <p className="label mb-3">Concept mastery</p>
        <div className="space-y-3">
          {data?.concepts?.map((c: any) => (
            <div key={c.concept}>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-800">{c.concept}</span>
                <span className="text-slate-500">{c.masteryScore}% · Level: {c.level}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full" style={{ width: `${c.masteryScore}%` }} />
              </div>
            </div>
          ))}
          {(!data?.concepts || data.concepts.length === 0) && <p className="text-sm text-slate-500">No concepts tracked yet.</p>}
        </div>
      </div>

      {/* Coddy Interactive Revision Skill Tree */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold">Personalized Learning Roadmap</span>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2 mt-0.5">
              <Sparkles className="w-5 h-5 text-indigo-400" /> Interactive Skill Tree & Revision Nodes
            </h2>
          </div>
          <button className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shrink-0" onClick={genRoadmap} disabled={loadingRoadmap}>
            <Sparkles size={14} /> {loadingRoadmap ? 'Generating Tree...' : 'Generate Skill Tree'}
          </button>
        </div>

        {roadmap && (
          <div className="max-w-xl mx-auto bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col items-center justify-center">
            <JourneyTree
              revisionPlan={roadmap}
              activeNodeId={selectedNode?.id}
              completedNodeIds={user?.completedNodes || []}
              onSelectNode={handleSelectNode}
            />
          </div>
        )}

        {/* Dedicated Quiz Modal Overlay */}
        <QuizModal
          isOpen={isQuizModalOpen}
          onClose={() => setIsQuizModalOpen(false)}
          node={selectedNode}
          onQuizComplete={() => {
            if (selectedNode) handleCompleteNode(selectedNode.id);
          }}
        />
      </div>
    </div>
  );
}
