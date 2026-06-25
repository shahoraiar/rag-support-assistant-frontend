import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockTickets, mockComments, mockTicketActivities } from '../../data/mockData';
import { TicketList } from '../../components/tickets/TicketCard';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { TicketTimeline, TicketStatusBanner, TicketConversation } from '../../components/tickets/TicketTimeline';
import type { Ticket } from '../../types';
import { Bell } from 'lucide-react';

export function CustomerTicketsPage() {
  const { user } = useAuth();
  const myTickets = mockTickets.filter((t) => t.customerId === user?.id);
  const [selected, setSelected] = useState<Ticket | null>(myTickets[0] || null);
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? myTickets : myTickets.filter((t) => t.status === filter);
  const comments = selected ? mockComments.filter((c) => c.ticketId === selected.id && !c.isInternal) : [];
  const activities = selected
    ? mockTicketActivities.filter((a) => a.ticketId === selected.id).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
    : [];

  const waitingCount = myTickets.filter((t) => t.status === 'open' && !t.assignedAgentId).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Tickets</h1>
          <p className="text-slate-500">{myTickets.length} total tickets</p>
        </div>
        {waitingCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <Bell className="h-4 w-4" />
            {waitingCount} ticket{waitingCount > 1 ? 's' : ''} waiting for agent
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
              filter === f ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <TicketList tickets={filtered} onSelect={setSelected} />
        </div>
        <div className="lg:col-span-3 space-y-4">
          {selected ? (
            <>
              <TicketStatusBanner ticket={selected} hasReplies={comments.length > 0} />

              <Card title={selected.subject} subtitle={selected.id}>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge label={selected.status.replace('_', ' ')} variant="status" value={selected.status} />
                  <Badge label={selected.priority} variant="priority" value={selected.priority} />
                  <Badge label={selected.category} />
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{selected.description}</p>
              </Card>

              <Card title="Activity Timeline" subtitle="Track what happened with your ticket">
                <TicketTimeline activities={activities} />
              </Card>

              <Card>
                <TicketConversation comments={comments} ticket={selected} />
              </Card>
            </>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-400">
              Select a ticket to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
