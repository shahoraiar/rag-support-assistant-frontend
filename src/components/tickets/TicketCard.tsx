import type { Ticket } from '../../types';
import { Badge } from '../ui/Badge';
import clsx from 'clsx';

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  showCustomer?: boolean;
  selected?: boolean;
  /** When true, highlight tickets with no assigned agent (agent queue). */
  highlightUnassigned?: boolean;
}

export function TicketCard({
  ticket,
  onClick,
  showCustomer,
  selected,
  highlightUnassigned = false,
}: TicketCardProps) {
  const isOverdue =
    new Date(ticket.slaDueAt) < new Date() && !['resolved', 'closed'].includes(ticket.status);
  const needsAccept = highlightUnassigned && !ticket.assignedAgentId;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? 'true' : undefined}
      className={clsx(
        'relative w-full rounded-xl border p-4 text-left transition',
        selected && needsAccept
          ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-400/40'
          : selected
            ? 'border-brand-500 bg-brand-50/40 shadow-md ring-2 ring-brand-500/30'
            : needsAccept
              ? 'border-amber-300 bg-amber-50/70 shadow-sm hover:border-amber-400 hover:shadow-md'
              : 'border-slate-200 bg-white shadow-sm hover:border-brand-300 hover:shadow-md',
      )}
    >
      {(selected || needsAccept) && (
        <span
          className={clsx(
            'absolute inset-y-3 left-0 w-1 rounded-full',
            needsAccept ? 'bg-amber-500' : 'bg-brand-600',
          )}
          aria-hidden
        />
      )}
      <div className={clsx('flex items-start justify-between gap-3', (selected || needsAccept) && 'pl-2')}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs text-slate-400">{ticket.id}</span>
            {needsAccept && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Needs accept
              </span>
            )}
            {selected && (
              <span
                className={clsx(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white',
                  needsAccept ? 'bg-amber-700' : 'bg-brand-600',
                )}
              >
                Viewing
              </span>
            )}
            {isOverdue && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-600">
                SLA Breach
              </span>
            )}
          </div>
          <h4 className="mt-1 truncate font-medium text-slate-900">{ticket.subject}</h4>
          {showCustomer && <p className="mt-0.5 text-sm text-slate-500">{ticket.customerName}</p>}
          <p className="mt-2 line-clamp-2 text-sm text-slate-500">{ticket.description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {needsAccept ? (
            <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              Unassigned
            </span>
          ) : (
            <Badge label={ticket.status.replace('_', ' ')} variant="status" value={ticket.status} />
          )}
          <Badge label={ticket.priority} variant="priority" value={ticket.priority} />
        </div>
      </div>
      <div
        className={clsx(
          'mt-3 flex items-center justify-between text-xs',
          (selected || needsAccept) && 'pl-2',
          needsAccept ? 'text-amber-700/80' : 'text-slate-400',
        )}
      >
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
  selectedId?: string | null;
  highlightUnassigned?: boolean;
}

export function TicketList({
  tickets,
  onSelect,
  showCustomer,
  emptyMessage = 'No tickets found',
  selectedId,
  highlightUnassigned = false,
}: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {tickets.map((t) => (
        <TicketCard
          key={t.id}
          ticket={t}
          selected={selectedId === t.id}
          onClick={() => onSelect?.(t)}
          showCustomer={showCustomer}
          highlightUnassigned={highlightUnassigned}
        />
      ))}
    </div>
  );
}
