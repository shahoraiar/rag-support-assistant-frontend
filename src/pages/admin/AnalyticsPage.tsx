import { mockAnalytics } from '../../data/mockData';
import { StatCard } from '../../components/ui/Card';
import { Card } from '../../components/ui/Card';
import { Clock, TrendingUp, Bot, Ticket } from 'lucide-react';

export function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500">Support performance metrics</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Resolved Today" value={mockAnalytics.resolvedToday} icon={<Ticket className="h-5 w-5" />} color="green" />
        <StatCard label="Avg Response" value={`${mockAnalytics.avgResponseMinutes}m`} icon={<Clock className="h-5 w-5" />} color="blue" />
        <StatCard label="SLA Compliance" value={`${mockAnalytics.slaCompliance}%`} icon={<TrendingUp className="h-5 w-5" />} color="amber" />
        <StatCard label="AI Resolution Rate" value={`${mockAnalytics.aiResolutionRate}%`} icon={<Bot className="h-5 w-5" />} color="purple" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Tickets by Category">
          <div className="space-y-3">
            {Object.entries(mockAnalytics.ticketsByCategory).map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="w-24 capitalize text-sm text-slate-600">{cat}</span>
                <div className="flex-1 rounded-full bg-slate-100 h-3">
                  <div
                    className="h-3 rounded-full bg-brand-500"
                    style={{ width: `${(count / mockAnalytics.totalTickets) * 100}%` }}
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
              <span className="font-bold">{mockAnalytics.totalTickets}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-3 text-sm sm:flex-row sm:justify-between">
              <span className="text-slate-600">Currently Open</span>
              <span className="font-bold text-amber-600">{mockAnalytics.openTickets}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-emerald-50 p-3 text-sm sm:flex-row sm:justify-between">
              <span className="text-slate-600">SLA Compliance</span>
              <span className="font-bold text-emerald-600">{mockAnalytics.slaCompliance}%</span>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-purple-50 p-3 text-sm sm:flex-row sm:justify-between">
              <span className="text-slate-600">AI Handled (no agent)</span>
              <span className="font-bold text-purple-600">{mockAnalytics.aiResolutionRate}%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
