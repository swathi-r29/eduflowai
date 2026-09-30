import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function AdminOverview() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.get('/analytics/admin/overview').then((r) => setData(r.data)); }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">System overview</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total users" value={data?.userCount} />
        <Stat label="Teachers" value={data?.teacherCount} />
        <Stat label="Students" value={data?.studentCount} />
        <Stat label="AI calls (recent)" value={data?.aiUsage?.totalCalls} />
        <Stat label="Failures" value={data?.aiUsage?.failureCount} />
        <Stat label="Fallback used" value={data?.aiUsage?.fallbackCount} />
        <Stat label="Avg latency" value={data?.aiUsage ? `${data.aiUsage.avgLatencyMs}ms` : undefined} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="card">
      <p className="label">{label}</p>
      <p className="text-2xl font-semibold">{value ?? '—'}</p>
    </div>
  );
}
