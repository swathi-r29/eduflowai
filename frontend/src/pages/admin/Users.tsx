import React, { useEffect, useState } from 'react';
import { api } from '../../api/client';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const load = () => api.get('/users').then((r) => setUsers(r.data.users));
  useEffect(() => { load(); }, []);

  const toggle = async (id: string, isActive: boolean) => {
    await api.patch(`/users/${id}/active`, { isActive: !isActive });
    load();
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Users</h1>
      <div className="card">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr><th className="pb-2">Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t border-base-700">
                <td className="py-2">{u.name}</td>
                <td>{u.email}</td>
                <td className="capitalize">{u.role}</td>
                <td>{u.isActive ? 'Active' : 'Disabled'}</td>
                <td><button className="text-brand-indigo text-xs" onClick={() => toggle(u._id, u.isActive)}>{u.isActive ? 'Disable' : 'Enable'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
