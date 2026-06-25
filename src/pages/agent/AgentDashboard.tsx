import { Ticket, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockTickets, mockAgentWorkloads } from '../../data/mockData';
import { StatCard } from '../../components/ui/Card';
import { TicketList } from '../../components/tickets/TicketCard';

export function AgentDashboard() {
  const { user } = useAuth();
  const assigned = mockTickets.filter((t) => t.assignedAgentId === user?.id);
  const open = assigned.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const overdue = open.filter((t) => new Date(t.slaDueAt) < new Date());
  const workload = mockAgentWorkloads.find((w) => w.agentId === user?.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Agent Dashboard</h1>
        <p className="text-slate-500">Welcome back, {user?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned Tickets" value={assigned.length} icon={<Ticket className="h-5 w-5" />} color="blue" />
        <StatCard label="Open / In Progress" value={open.length} icon={<Clock className="h-5 w-5" />} color="amber" />
        <StatCard label="SLA Breaches" value={overdue.length} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
        <StatCard
          label="Capacity"
          value={`${workload?.openTickets ?? 0}/${workload?.maxTickets ?? 10}`}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Your Active Tickets</h2>
        <TicketList tickets={open} showCustomer />
      </div>
    </div>
  );
}
