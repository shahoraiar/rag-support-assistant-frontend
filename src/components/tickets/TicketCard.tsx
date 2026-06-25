import clsx from 'clsx';
import type { Ticket } from '../../types';
import { Badge } from '../ui/Badge';

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  showCustomer?: boolean;
}

export function TicketCard({ ticket, onClick, showCustomer }: TicketCardProps) {
  const isOverdue = new Date(ticket.slaDueAt) < new Date() && !['resolved', 'closed'].includes(ticket.status);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-400">{ticket.id}</span>
            {isOverdue && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">SLA Breach</span>
            )}
          </div>
          <h4 className="mt-1 truncate font-medium text-slate-900">{ticket.subject}</h4>
          {showCustomer && <p className="mt-0.5 text-sm text-slate-500">{ticket.customerName}</p>}
          <p className="mt-2 line-clamp-2 text-sm text-slate-500">{ticket.description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge label={ticket.status.replace('_', ' ')} variant="status" value={ticket.status} />
          <Badge label={ticket.priority} variant="priority" value={ticket.priority} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span className="capitalize">{ticket.category}</span>
        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
      </div>
    </button>
  );
}

interface TicketListProps {
  tickets: Ticket[];
  onSelect?: (ticket: Ticket) => void;
  showCustomer?: boolean;
  emptyMessage?: string;
}

export function TicketList({ tickets, onSelect, showCustomer, emptyMessage = 'No tickets found' }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={clsx('grid gap-3', tickets.length > 1 && 'md:grid-cols-2')}>
      {tickets.map((t) => (
        <TicketCard key={t.id} ticket={t} onClick={() => onSelect?.(t)} showCustomer={showCustomer} />
      ))}
    </div>
  );
}
