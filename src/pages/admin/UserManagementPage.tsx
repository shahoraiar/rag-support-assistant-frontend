import { Plus } from 'lucide-react';
import { useState } from 'react';
import { AddUserModal } from '../../components/admin/AddUserModal';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { getAllUsers } from '../../data/userStore';
import type { User } from '../../types';

function UserAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
      {name.charAt(0)}
    </div>
  );
}

export function UserManagementPage() {
  const [users, setUsers] = useState<User[]>(() => getAllUsers());
  const [modalOpen, setModalOpen] = useState(false);

  const handleUserCreated = (user: User) => {
    setUsers((current) => [...current, user]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">User Management</h1>
          <p className="text-sm text-slate-500 sm:text-base">{users.length} users in the system</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {users.map((user) => (
          <div key={user.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <UserAvatar name={user.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{user.name}</p>
                <p className="truncate text-sm text-slate-500">{user.email}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge label={user.role} />
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
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600 lg:px-6">Name</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 lg:px-6">Email</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 lg:px-6">Role</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600 lg:px-6">Status</th>
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
                  <Badge label={user.role} />
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleUserCreated}
      />
    </div>
  );
}
