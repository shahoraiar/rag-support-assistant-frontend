import { useEffect, useState } from 'react';
import { Ticket, BookOpen, TrendingUp } from 'lucide-react';
import {
  fetchAgentWorkload,
  fetchAnalytics,
  fetchKnowledgeDocuments,
  fetchTickets,
} from '../../lib/api';
import { StatCard } from '../../components/ui/Card';
import { Card } from '../../components/ui/Card';
import type { AgentWorkload, AnalyticsSummary, Ticket as TicketType } from '../../types';

const emptyAnalytics: AnalyticsSummary = {
  totalTickets: 0,
  openTickets: 0,
  resolvedToday: 0,
  slaCompliance: 0,
  aiResolutionRate: 0,
  avgResponseMinutes: 0,
  ticketsByStatus: { open: 0, in_progress: 0, resolved: 0, closed: 0 },
  ticketsByCategory: { billing: 0, technical: 0, account: 0, general: 0 },
};

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(emptyAnalytics);
  const [workloads, setWorkloads] = useState<AgentWorkload[]>([]);
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [docStats, setDocStats] = useState({ ready: 0, processing: 0, total: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [analyticsData, workloadData, ticketData, docs] = await Promise.all([
          fetchAnalytics(),
          fetchAgentWorkload(),
          fetchTickets(),
          fetchKnowledgeDocuments(),
        ]);
        if (!cancelled) {
          setAnalytics(analyticsData);
          setWorkloads(workloadData);
          setTickets(ticketData);
          setDocStats({
            ready: docs.filter((d) => d.status === 'ready').length,
            processing: docs.filter((d) => d.status === 'processing').length,
            total: docs.length,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500">System overview and management</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tickets" value={analytics.totalTickets} icon={<Ticket className="h-5 w-5" />} color="blue" />
        <StatCard label="Open Tickets" value={analytics.openTickets} icon={<Ticket className="h-5 w-5" />} color="amber" />
        <StatCard label="SLA Compliance" value={`${analytics.slaCompliance}%`} icon={<TrendingUp className="h-5 w-5" />} color="green" />
        <StatCard label="AI Resolution" value={`${analytics.aiResolutionRate}%`} icon={<BookOpen className="h-5 w-5" />} color="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Tickets by Status">
          <div className="space-y-3">
            {Object.entries(analytics.ticketsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <span className="w-24 capitalize text-sm text-slate-600">{status.replace('_', ' ')}</span>
                <div className="flex-1 rounded-full bg-slate-100 h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-brand-600"
                    style={{ width: `${analytics.totalTickets ? (count / analytics.totalTickets) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Agent Workload">
          <div className="space-y-4">
            {workloads.length === 0 && <p className="text-sm text-slate-400">No agents found</p>}
            {workloads.map((w) => (
              <div key={w.agentId} className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {w.agentName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{w.agentName}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="min-w-0 flex-1 rounded-full bg-slate-100 h-2">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${w.maxTickets ? (w.openTickets / w.maxTickets) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">{w.openTickets}/{w.maxTickets}</span>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${w.isAvailable ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {w.isAvailable ? 'Online' : 'Offline'}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Knowledge Base">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-600">{docStats.ready}</p>
              <p className="text-xs text-slate-500">Ready</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{docStats.processing}</p>
              <p className="text-xs text-slate-500">Processing</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-600">{docStats.total}</p>
              <p className="text-xs text-slate-500">Total</p>
            </div>
          </div>
        </Card>

        <Card title="Recent Activity">
          <div className="space-y-3">
            {tickets.slice(0, 4).map((t) => (
              <div key={t.id} className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="font-mono text-xs text-slate-400">{t.id}</span>
                  <p className="truncate font-medium text-slate-700">{t.subject}</p>
                </div>
                <span className="shrink-0 capitalize text-xs text-slate-400">{t.status.replace('_', ' ')}</span>
              </div>
            ))}
            {tickets.length === 0 && <p className="text-sm text-slate-400">No tickets yet</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
