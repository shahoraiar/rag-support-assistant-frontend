import { mockUsers } from '../../data/mockData';
import { Badge } from '../../components/ui/Badge';

export function UserManagementPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-500">{mockUsers.length} users in the system</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-slate-600">Name</th>
              <th className="px-6 py-3 text-left font-medium text-slate-600">Email</th>
              <th className="px-6 py-3 text-left font-medium text-slate-600">Role</th>
              <th className="px-6 py-3 text-left font-medium text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mockUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {u.name.charAt(0)}
                    </div>
                    {u.name}
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500">{u.email}</td>
                <td className="px-6 py-4"><Badge label={u.role} /></td>
                <td className="px-6 py-4">
                  {u.role === 'agent' ? (
                    <span className={`text-xs font-medium ${u.isAvailable ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {u.isAvailable ? 'Available' : 'Offline'}
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
    </div>
  );
}
