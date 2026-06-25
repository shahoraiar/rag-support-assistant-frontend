import clsx from 'clsx';
import type { TicketPriority, TicketStatus, DocStatus } from '../../types';

const statusStyles: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-600',
};

const priorityStyles: Record<TicketPriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-sky-100 text-sky-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const docStatusStyles: Record<DocStatus, string> = {
  pending: 'bg-slate-100 text-slate-600',
  processing: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

interface BadgeProps {
  label: string;
  variant?: 'status' | 'priority' | 'doc';
  value?: TicketStatus | TicketPriority | DocStatus;
  className?: string;
}

export function Badge({ label, variant = 'status', value, className }: BadgeProps) {
  let style = 'bg-slate-100 text-slate-600';
  if (variant === 'status' && value) style = statusStyles[value as TicketStatus];
  if (variant === 'priority' && value) style = priorityStyles[value as TicketPriority];
  if (variant === 'doc' && value) style = docStatusStyles[value as DocStatus];

  return (
    <span className={clsx('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', style, className)}>
      {label}
    </span>
  );
}
