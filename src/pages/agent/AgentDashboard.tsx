import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchAgentWorkload, fetchTickets } from '../../lib/api';
import { StatCard } from '../../components/ui/Card';
import { TicketList } from '../../components/tickets/TicketCard';
import type { AgentWorkload, Ticket as TicketType } from '../../types';

export function AgentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [workload, setWorkload] = useState<AgentWorkload | undefined>();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [ticketData, workloads] = await Promise.all([fetchTickets(), fetchAgentWorkload()]);
        if (!cancelled) {
          setTickets(ticketData);
          setWorkload(workloads.find((w) => w.agentId === user?.id));
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
  }, [user?.id]);

  const assigned = tickets.filter((t) => t.assignedAgentId === user?.id);
  const open = assigned.filter((t) => t.status === 'open' || t.status === 'in_progress');
  const overdue = open.filter((t) => new Date(t.slaDueAt) < new Date());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Agent Dashboard</h1>
        <p className="text-slate-500">Welcome back, {user?.name}</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned Tickets" value={assigned.length} icon={<Ticket className="h-5 w-5" />} color="blue" />
        <StatCard label="Open / In Progress" value={open.length} icon={<Clock className="h-5 w-5" />} color="amber" />
        <StatCard label="SLA Breaches" value={overdue.length} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
        <StatCard
          label="Capacity"
          value={`${workload?.openTickets ?? open.length}/${workload?.maxTickets ?? 10}`}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Your Active Tickets</h2>
        <TicketList
          tickets={open}
          showCustomer
          highlightUnassigned
          onSelect={(t) => navigate(`/agent/tickets?ticket=${encodeURIComponent(t.id)}`)}
        />
      </div>
    </div>
  );
}
