import { KeyRound, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { AddUserModal } from '../../components/admin/AddUserModal';
import { ChangePasswordModal } from '../../components/admin/ChangePasswordModal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { fetchAgents, fetchCustomers } from '../../lib/api';
import type { User, UserRole } from '../../types';

type UserFilter = 'agents' | 'customers' | 'all';

function UserAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
      {name.charAt(0)}
    </div>
  );
}

function roleLabel(role: UserRole) {
  if (role === 'agent') return 'agent';
  if (role === 'customer') return 'customer';
  return role;
}

export function UserManagementPage() {
  const [agents, setAgents] = useState<User[]>([]);
  const [customers, setCustomers] = useState<User[]>([]);
  const [filter, setFilter] = useState<UserFilter>('agents');
  const [addOpen, setAddOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const [agentList, customerList] = await Promise.all([fetchAgents(), fetchCustomers()]);
      setAgents(agentList.filter((u) => u.role === 'agent'));
      setCustomers(customerList.filter((u) => u.role === 'customer'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUserCreated = (user: User) => {
    if (user.role === 'customer') {
      setCustomers((current) => [...current, user]);
      return;
    }
    if (user.role === 'agent') {
      setAgents((current) => [...current, user]);
    }
  };

  const users = useMemo(() => {
    if (filter === 'agents') return agents;
    if (filter === 'customers') return customers;
    return [...agents, ...customers];
  }, [filter, agents, customers]);

  const filters: { id: UserFilter; label: string; count: number }[] = [
    { id: 'agents', label: 'Agents', count: agents.length },
    { id: 'customers', label: 'Customers', count: customers.length },
    { id: 'all', label: 'All', count: agents.length + customers.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">User Management</h1>
          <p className="text-sm text-slate-500 sm:text-base">
            {users.length} users shown
            {filter === 'customers'
              ? ' (customers)'
              : filter === 'agents'
                ? ' (agents)'
                : ` · ${agents.length} agents · ${customers.length} customers`}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Agent
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={clsx(
              'rounded-full border px-3.5 py-1.5 text-sm font-medium transition',
              filter === item.id
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700',
            )}
          >
            {item.label}
            <span
              className={clsx(
                'ml-1.5 text-xs',
                filter === item.id ? 'text-white/80' : 'text-slate-400',
              )}
            >
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {success && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading users…</p>}

      <div className="space-y-3 md:hidden">
        {users.map((user) => (
          <div key={user.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <UserAvatar name={user.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{user.name}</p>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge label={roleLabel(user.role)} />
                  <Badge label={user.source || 'email'} />
                  {user.role === 'agent' && (
                    <span
                      className={`text-xs font-medium ${
                        user.isAvailable ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {user.isAvailable ? 'Available' : 'Offline'}
                    </span>
                  )}
                </div>
                {user.role === 'agent' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 gap-1.5"
                    onClick={() => {
                      setSuccess('');
                      setPasswordUser(user);
                    }}
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Change password
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
        {!loading && !users.length && (
          <p className="text-sm text-slate-400">No users in this filter.</p>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 lg:px-6">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 lg:px-6">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 lg:px-6">Role</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 lg:px-6">Source</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 lg:px-6">Status</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600 lg:px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-4 lg:px-6">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={user.name} />
                    <span className="truncate">{user.name}</span>
                  </div>
                </td>
                <td className="max-w-[200px] truncate px-4 py-4 text-slate-500 lg:px-6">{user.email}</td>
                <td className="px-4 py-4 lg:px-6">
                  <Badge label={roleLabel(user.role)} />
                </td>
                <td className="px-4 py-4 lg:px-6">
                  <Badge label={user.source || 'email'} />
                </td>
                <td className="px-4 py-4 lg:px-6">
                  {user.role === 'agent' ? (
                    <span
                      className={`text-xs font-medium ${
                        user.isAvailable ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {user.isAvailable ? 'Available' : 'Offline'}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-right lg:px-6">
                  {user.role === 'agent' ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setSuccess('');
                        setPasswordUser(user);
                      }}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Change password
                    </Button>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && !users.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                  No users in this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={handleUserCreated}
      />
      <ChangePasswordModal
        open={Boolean(passwordUser)}
        user={passwordUser}
        onClose={() => setPasswordUser(null)}
        onSuccess={(message) => setSuccess(message)}
      />
    </div>
  );
}
