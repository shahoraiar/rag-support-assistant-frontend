import { useEffect, useRef, type ReactNode } from 'react';
import {
  Bot,
  Clock,
  Headphones,
  CheckCircle,
  MessageSquare,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import type { Ticket, TicketActivity, TicketComment } from '../../types';
import { Badge } from '../ui/Badge';

interface TicketTimelineProps {
  activities: TicketActivity[];
  compact?: boolean;
}

const activityConfig = {
  created: { icon: MessageSquare, color: 'bg-blue-100 text-blue-600', label: 'Submitted' },
  ai_classified: { icon: Sparkles, color: 'bg-purple-100 text-purple-600', label: 'Classified' },
  agent_assigned: { icon: UserPlus, color: 'bg-emerald-100 text-emerald-600', label: 'Accepted' },
  agent_replied: { icon: Headphones, color: 'bg-brand-100 text-brand-600', label: 'Agent reply' },
  customer_replied: { icon: MessageSquare, color: 'bg-slate-100 text-slate-600', label: 'Your reply' },
  resolved: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600', label: 'Resolved' },
  chat_started: { icon: Bot, color: 'bg-purple-100 text-purple-600', label: 'Chat started' },
  chat_escalated: { icon: Headphones, color: 'bg-amber-100 text-amber-600', label: 'Escalated' },
};

const MILESTONE_TYPES = new Set(['created', 'agent_assigned', 'resolved', 'chat_escalated']);

export function TicketTimeline({ activities, compact = false }: TicketTimelineProps) {
  const milestones = activities.filter((a) => MILESTONE_TYPES.has(a.type));
  if (milestones.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {milestones.map((activity, index) => {
          const config = activityConfig[activity.type] || activityConfig.created;
          const Icon = config.icon;
          return (
            <div key={activity.id} className="flex items-center gap-1.5">
              {index > 0 && <span className="h-px w-3 bg-slate-200" aria-hidden />}
              <span
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
                  config.color,
                )}
                title={`${activity.message} · ${new Date(activity.createdAt).toLocaleString()}`}
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {milestones.map((activity, index) => {
        const config = activityConfig[activity.type] || activityConfig.created;
        const Icon = config.icon;
        const isLast = index === milestones.length - 1;

        return (
          <div key={activity.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={clsx('flex h-8 w-8 items-center justify-center rounded-full', config.color)}>
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && <div className="my-1 w-0.5 flex-1 bg-slate-200" />}
            </div>
            <div className={clsx('pb-5', isLast && 'pb-0')}>
              <p className="text-sm font-medium text-slate-800">{activity.message}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {new Date(activity.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TicketStatusBannerProps {
  ticket: Ticket;
  hasReplies: boolean;
}

/** Compact status chip for conversation header — not a full-width card. */
export function TicketStatusBanner({ ticket, hasReplies }: TicketStatusBannerProps) {
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle className="h-3.5 w-3.5" />
        {ticket.status === 'resolved' ? 'Resolved' : 'Closed'}
      </span>
    );
  }

  if (ticket.status === 'open' && !ticket.assignedAgentName) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
        <Clock className="h-3.5 w-3.5 animate-pulse" />
        Waiting for agent
      </span>
    );
  }

  if (ticket.assignedAgentName && !hasReplies) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800">
        <Headphones className="h-3.5 w-3.5" />
        {ticket.assignedAgentName} assigned
      </span>
    );
  }

  if (hasReplies && ticket.status === 'in_progress') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
        <MessageSquare className="h-3.5 w-3.5" />
        With {ticket.assignedAgentName || 'agent'}
      </span>
    );
  }

  return null;
}

interface TicketConversationProps {
  comments: TicketComment[];
  ticket: Ticket;
  replyText?: string;
  onReplyTextChange?: (value: string) => void;
  onSendReply?: () => void;
  sending?: boolean;
  currentUserId?: string;
  peerTypingLabel?: string | null;
  liveStatus?: string | null;
  onTypingChange?: (isTyping: boolean) => void;
  activities?: TicketActivity[];
  statusSlot?: ReactNode;
  counterpartLabel?: string;
  subtitle?: string;
  emptyHint?: string;
  beforeComposer?: ReactNode;
  composerActions?: ReactNode;
}

export function TicketConversation({
  comments,
  ticket,
  replyText = '',
  onReplyTextChange,
  onSendReply,
  sending = false,
  currentUserId,
  peerTypingLabel,
  liveStatus,
  onTypingChange,
  activities = [],
  statusSlot,
  counterpartLabel = 'Agent',
  subtitle,
  emptyHint = 'You will be notified when an agent responds',
  beforeComposer,
  composerActions,
}: TicketConversationProps) {
  const showComposer = Boolean(onSendReply && onReplyTextChange);
  const typingIdleRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length, peerTypingLabel]);

  const handleTextChange = (value: string) => {
    onReplyTextChange?.(value);
    if (!onTypingChange) return;
    onTypingChange(true);
    if (typingIdleRef.current) window.clearTimeout(typingIdleRef.current);
    typingIdleRef.current = window.setTimeout(() => onTypingChange(false), 1200);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-slate-900">{ticket.subject}</h3>
              <span className="font-mono text-xs text-slate-400">{ticket.id}</span>
            </div>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge label={ticket.status.replace('_', ' ')} variant="status" value={ticket.status} />
              <Badge label={ticket.priority} variant="priority" value={ticket.priority} />
              <Badge label={ticket.category} />
              {statusSlot}
            </div>
          </div>
          {liveStatus && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {liveStatus}
            </span>
          )}
        </div>
        {activities.length > 0 && (
          <div className="mt-3 border-t border-slate-50 pt-2.5">
            <TicketTimeline activities={activities} compact />
          </div>
        )}
        {ticket.description && (
          <p className="mt-2 line-clamp-2 text-xs text-slate-500">{ticket.description}</p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
        {comments.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 text-center">
            <Clock className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-medium text-slate-500">No replies yet</p>
            <p className="text-xs text-slate-400">{emptyHint}</p>
          </div>
        ) : (
          comments.map((c) => {
            const isOwn = currentUserId != null && c.senderId === currentUserId;
            return (
              <div
                key={c.id}
                className={clsx(
                  'rounded-xl border p-3.5',
                  isOwn ? 'ml-4 border-brand-100 bg-brand-50/50' : 'mr-4 border-slate-100 bg-slate-50',
                )}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <div
                      className={clsx(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        isOwn ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-700',
                      )}
                    >
                      {c.senderName.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-slate-800">{c.senderName}</span>
                    <span
                      className={clsx(
                        'rounded px-1.5 py-0.5 text-xs',
                        isOwn ? 'bg-brand-100 text-brand-700' : 'bg-white text-slate-500',
                      )}
                    >
                      {isOwn ? 'You' : counterpartLabel}
                    </span>
                    {c.isInternal && (
                      <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700">
                        Internal
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{c.content}</p>
                {isOwn && c.seenAt && (
                  <p className="mt-1 text-right text-xs font-medium text-brand-600">Seen</p>
                )}
              </div>
            );
          })
        )}
        {peerTypingLabel && <p className="text-xs italic text-slate-400">{peerTypingLabel}</p>}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-5">
        {beforeComposer}
        {showComposer ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 focus-within:border-brand-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
            <textarea
              value={replyText}
              onChange={(e) => handleTextChange(e.target.value)}
              onBlur={() => onTypingChange?.(false)}
              placeholder="Write a follow-up message..."
              className="w-full resize-none rounded-lg border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
              rows={2}
            />
            <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
              {composerActions}
              <button
                type="button"
                disabled={sending || !replyText.trim()}
                onClick={() => {
                  onTypingChange?.(false);
                  onSendReply?.();
                }}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send Reply'}
              </button>
            </div>
          </div>
        ) : ticket.status === 'resolved' || ticket.status === 'closed' ? (
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
            This ticket is {ticket.status}. Replies are closed.
          </p>
        ) : null}
      </div>
    </div>
  );
}
