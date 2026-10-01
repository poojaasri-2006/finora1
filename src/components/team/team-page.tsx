'use client';

import { useEffect, useState } from 'react';
import { DeleteButton } from '@/components/ui/delete-button';
import { useToast } from '@/components/ui/toast-provider';
import { useAuth } from '@/components/auth/auth-provider';
import { canManage } from '@/lib/roles';

interface Member {
  userId: string;
  name: string;
  email: string;
  role: string;
  isSelf: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  FINANCE_MANAGER: 'Finance manager',
  VIEWER: 'Viewer',
};

export function TeamPage() {
  const { addToast } = useToast();
  const { user } = useAuth();
  const mayManage = canManage(user?.role);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    fetch('/api/team')
      .then(async (res) => {
        if (res.status === 403) { setDenied(true); return; }
        if (!res.ok) throw new Error('Failed to load team');
        const data = await res.json();
        setMembers(data.members || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load team'))
      .finally(() => setLoading(false));
  }, []);

  async function changeRole(userId: string, role: string) {
    const response = await fetch(`/api/team/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      addToast('error', 'Could not change role', body.error);
      return;
    }
    setMembers((current) => current.map((m) => (m.userId === userId ? { ...m, role } : m)));
    addToast('success', 'Role updated');
  }

  async function removeMember(userId: string) {
    const response = await fetch(`/api/team/${userId}`, { method: 'DELETE' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      addToast('error', 'Could not remove member', body.error);
      throw new Error('Could not remove member');
    }
    setMembers((current) => current.filter((m) => m.userId !== userId));
    addToast('success', 'Member removed');
  }

  if (loading) return <div className="space-y-6 animate-pulse"><div className="h-8 bg-slate-200 rounded w-64" /><div className="h-72 bg-slate-100 rounded-2xl" /></div>;

  if (denied) {
    return <div className="bg-amber-50 border border-amber-200 rounded-lg p-4"><h3 className="text-amber-800 font-medium">Restricted</h3><p className="text-amber-700 text-sm mt-1">Team management is available to owners and admins only.</p></div>;
  }
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4"><h3 className="text-red-700 font-medium">Error</h3><p className="text-red-600 text-sm mt-1">{error}</p></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Team</h1>
        <p className="text-slate-500 mt-1">People with access to this workspace and their roles</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
        <table className="financial-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th>{mayManage && <th className="text-right">Actions</th>}</tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.userId}>
                <td className="font-medium text-slate-900">{member.name}{member.isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}</td>
                <td className="text-slate-600">{member.email}</td>
                <td>
                  {mayManage && !member.isSelf ? (
                    <select value={member.role} onChange={(e) => changeRole(member.userId, e.target.value)} className="form-select">
                      {Object.keys(ROLE_LABELS).map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}
                    </select>
                  ) : (
                    <span className={member.role === 'OWNER' ? 'badge-safe' : 'badge-neutral'}>{ROLE_LABELS[member.role] ?? member.role}</span>
                  )}
                </td>
                {mayManage && (
                  <td className="text-right">
                    {!member.isSelf && <DeleteButton label={`Remove ${member.name}`} confirmText={`Remove ${member.name} from this workspace?`} onDelete={() => removeMember(member.userId)} />}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">Owners and admins manage roles. Finance managers can create and edit records. Viewers have read-only access.</p>
    </div>
  );
}
