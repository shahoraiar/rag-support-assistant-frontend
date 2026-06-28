import { useState } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockTickets, mockComments, mockTicketActivities } from '../../data/mockData';
import { TicketList } from '../../components/tickets/TicketCard';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TicketTimeline, TicketStatusBanner, TicketConversation } from '../../components/tickets/TicketTimeline';
import type { Ticket } from '../../types';

export function CustomerTicketsPage() {
  const { user } = useAuth();
  const myTickets = mockTickets.filter((t) => t.customerId === user?.id);
  const [selected, setSelected] = useState<Ticket | null>(myTickets[0] || null);
  const [filter, setFilter] = useState<string>('all');
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const filtered = filter === 'all' ? myTickets : myTickets.filter((t) => t.status === filter);
  const comments = selected ? mockComments.filter((c) => c.ticketId === selected.id && !c.isInternal) : [];
  const activities = selected
    ? mockTicketActivities.filter((a) => a.ticketId === selected.id).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
    : [];

  const waitingCount = myTickets.filter((t) => t.status === 'open' && !t.assignedAgentId).length;

  const handleSelect = (ticket: Ticket) => {
    setSelected(ticket);
    setMobileShowDetail(true);
  };

  const handleBack = () => {
    setMobileShowDetail(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">My Tickets</h1>
          <p className="text-sm text-slate-500 sm:text-base">{myTickets.length} total tickets</p>
        </div>
        {waitingCount > 0 && (
          <div className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:w-auto">
            <Bell className="h-4 w-4 shrink-0" />
            {waitingCount} ticket{waitingCount > 1 ? 's' : ''} waiting for agent
          </div>
        )}
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {['all', 'open', 'in_progress', 'resolved', 'closed'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition ${
              filter === f ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
        <div className={`lg:col-span-2 ${mobileShowDetail ? 'hidden lg:block' : ''}`}>
          <TicketList tickets={filtered} onSelect={handleSelect} />
        </div>
        <div className={`space-y-4 lg:col-span-3 ${!mobileShowDetail ? 'hidden lg:block' : ''}`}>
          {selected ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to tickets
              </Button>

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
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400 sm:h-64">
              Select a ticket to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
