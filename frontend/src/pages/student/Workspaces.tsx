import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Workspace } from '../../types';
import { FolderPlus } from 'lucide-react';

export default function Workspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');

  const load = () => api.get('/workspaces').then((r) => setWorkspaces(r.data.workspaces));
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title.trim()) return;
    await api.post('/workspaces', { title });
    setTitle('');
    setCreating(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Study workspaces</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => setCreating(true)}>
          <FolderPlus size={16} /> New workspace
        </button>
      </div>

      {creating && (
        <div className="card mb-6 max-w-md">
          <label className="label">Workspace title</label>
          <input className="input-field mb-3" placeholder="e.g. Java OOP – Semester Prep" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex gap-2 justify-end">
            <button className="btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn-primary" onClick={create}>Create</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {workspaces.map((w) => (
          <Link key={w._id} to={`/student/workspaces/${w._id}`} className="card hover:border-brand-indigo/50 transition">
            <h3 className="font-semibold">{w.title}</h3>
            <p className="text-sm text-slate-400 mt-1">{w.description || 'No description'}</p>
            <p className="text-xs text-slate-500 mt-3">
              {Array.isArray(w.documents) ? w.documents.length : 0} documents · {Array.isArray(w.videos) ? w.videos.length : 0} videos
            </p>
          </Link>
        ))}
        {workspaces.length === 0 && <p className="text-slate-500">No workspaces yet — create one to start uploading material.</p>}
      </div>
    </div>
  );
}
