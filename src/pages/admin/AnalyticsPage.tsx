import { useEffect, useState } from 'react';
import { fetchAnalytics } from '../../lib/api';
import { StatCard } from '../../components/ui/Card';
import { Card } from '../../components/ui/Card';
import { Clock, TrendingUp, Bot, Ticket } from 'lucide-react';
import type { AnalyticsSummary } from '../../types';

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

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary>(emptyAnalytics);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchAnalytics();
        if (!cancelled) setAnalytics(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics');
        }
      } finally {
        if (!cancelled) setLoading(false);
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
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500">Support performance metrics</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading analytics…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Resolved Today" value={analytics.resolvedToday} icon={<Ticket className="h-5 w-5" />} color="green" />
        <StatCard label="Avg Response" value={`${analytics.avgResponseMinutes}m`} icon={<Clock className="h-5 w-5" />} color="blue" />
        <StatCard label="SLA Compliance" value={`${analytics.slaCompliance}%`} icon={<TrendingUp className="h-5 w-5" />} color="amber" />
        <StatCard label="AI Resolution Rate" value={`${analytics.aiResolutionRate}%`} icon={<Bot className="h-5 w-5" />} color="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Tickets by Category">
          <div className="space-y-3">
            {Object.entries(analytics.ticketsByCategory).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-24 capitalize text-sm text-slate-600">{cat}</span>
                <div className="flex-1 rounded-full bg-slate-100 h-3">
                  <div
                    className="h-3 rounded-full bg-brand-500"
                    style={{ width: `${analytics.totalTickets ? (count / analytics.totalTickets) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-8 text-right text-sm font-medium">{count}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Performance Summary">
          <div className="space-y-4 text-sm">
            <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3 text-sm sm:flex-row sm:justify-between">
              <span className="text-slate-600">Total Tickets (all time)</span>
              <span className="font-bold">{analytics.totalTickets}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3 text-sm sm:flex-row sm:justify-between">
              <span className="text-slate-600">Currently Open</span>
              <span className="font-bold text-amber-600">{analytics.openTickets}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-emerald-50 p-3 text-sm sm:flex-row sm:justify-between">
              <span className="text-slate-600">SLA Compliance</span>
              <span className="font-bold text-emerald-600">{analytics.slaCompliance}%</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-purple-50 p-3 text-sm sm:flex-row sm:justify-between">
              <span className="text-slate-600">AI Handled (no agent)</span>
              <span className="font-bold text-purple-600">{analytics.aiResolutionRate}%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
