import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function AIUsage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.get('/ai/admin/usage').then((r) => setData(r.data)); }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">AI usage & observability</h1>

      <div className="card mb-6">
        <h2 className="font-semibold mb-3">By agent</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="pb-2">Agent</th><th>Success</th><th>Failure</th><th>Fallback</th><th>Avg ms</th></tr>
          </thead>
          <tbody>
            {data?.byAgent && Object.entries(data.byAgent).map(([agent, s]: any) => (
              <tr key={agent} className="border-t border-base-700">
                <td className="py-2 font-mono text-xs">{agent}</td>
                <td>{s.success || 0}</td>
                <td className={s.failure ? 'text-red-400' : ''}>{s.failure || 0}</td>
                <td className={s.fallback ? 'text-amber-400' : ''}>{s.fallback || 0}</td>
                <td>{Math.round(s.avgMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!data?.byAgent || Object.keys(data.byAgent).length === 0) && <p className="text-sm text-slate-500">No AI calls logged yet.</p>}
      </div>

      <div className="card">
        <h2 className="font-semibold mb-3">Recent log entries</h2>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {data?.recentLogs?.map((l: any) => (
            <div key={l._id} className="text-xs flex justify-between border-b border-base-700 py-1">
              <span className="font-mono">{l.agent}</span>
              <span>{l.provider}</span>
              <span className={l.status === 'failure' ? 'text-red-400' : l.status === 'fallback' ? 'text-amber-400' : 'text-emerald-400'}>{l.status}</span>
              <span className="text-slate-500">{l.processingTimeMs}ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
