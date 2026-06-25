import { Ticket, BookOpen, TrendingUp } from 'lucide-react';
import { mockAnalytics, mockDocuments, mockTickets, mockAgentWorkloads } from '../../data/mockData';
import { StatCard } from '../../components/ui/Card';
import { Card } from '../../components/ui/Card';

export function AdminDashboard() {
  const readyDocs = mockDocuments.filter((d) => d.status === 'ready').length;
  const processingDocs = mockDocuments.filter((d) => d.status === 'processing').length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500">System overview and management</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tickets" value={mockAnalytics.totalTickets} icon={<Ticket className="h-5 w-5" />} color="blue" />
        <StatCard label="Open Tickets" value={mockAnalytics.openTickets} icon={<Ticket className="h-5 w-5" />} color="amber" />
        <StatCard label="SLA Compliance" value={`${mockAnalytics.slaCompliance}%`} icon={<TrendingUp className="h-5 w-5" />} color="green" />
        <StatCard label="AI Resolution" value={`${mockAnalytics.aiResolutionRate}%`} icon={<BookOpen className="h-5 w-5" />} color="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Tickets by Status">
          <div className="space-y-3">
            {Object.entries(mockAnalytics.ticketsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="w-24 capitalize text-sm text-slate-600">{status.replace('_', ' ')}</span>
                <div className="flex-1 rounded-full bg-slate-100 h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-brand-600"
                    style={{ width: `${(count / mockAnalytics.totalTickets) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Agent Workload">
          <div className="space-y-4">
            {mockAgentWorkloads.map((w) => (
              <div key={w.agentId} className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {w.agentName.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{w.agentName}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex-1 rounded-full bg-slate-100 h-2">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${(w.openTickets / w.maxTickets) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{w.openTickets}/{w.maxTickets}</span>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${w.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {w.isAvailable ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Knowledge Base">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{readyDocs}</p>
              <p className="text-xs text-slate-500">Ready</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{processingDocs}</p>
              <p className="text-xs text-slate-500">Processing</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-600">{mockDocuments.length}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </Card>

        <Card title="Recent Activity">
          <div className="space-y-3">
            {mockTickets.slice(0, 4).map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono text-xs text-slate-400">{t.id}</span>
                  <p className="font-medium text-slate-700">{t.subject}</p>
                </div>
                <span className="capitalize text-xs text-slate-400">{t.status.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
