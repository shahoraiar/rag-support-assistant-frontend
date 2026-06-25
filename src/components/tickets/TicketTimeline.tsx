import { Bot, Clock, Headphones, CheckCircle, MessageSquare, UserPlus, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import type { Ticket, TicketActivity, TicketComment } from '../../types';

interface TicketTimelineProps {
  activities: TicketActivity[];
}

const activityConfig = {
  created: { icon: MessageSquare, color: 'bg-blue-100 text-blue-600', dot: 'bg-blue-500' },
  ai_classified: { icon: Sparkles, color: 'bg-purple-100 text-purple-600', dot: 'bg-purple-500' },
  agent_assigned: { icon: UserPlus, color: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-500' },
  agent_replied: { icon: Headphones, color: 'bg-brand-100 text-brand-600', dot: 'bg-brand-500' },
  customer_replied: { icon: MessageSquare, color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  resolved: { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-500' },
  chat_started: { icon: Bot, color: 'bg-purple-100 text-purple-600', dot: 'bg-purple-500' },
  chat_escalated: { icon: Headphones, color: 'bg-amber-100 text-amber-600', dot: 'bg-amber-500' },
};

export function TicketTimeline({ activities }: TicketTimelineProps) {
  if (activities.length === 0) return null;

  return (
    <div className="space-y-0">
      {activities.map((activity, index) => {
        const config = activityConfig[activity.type];
        const Icon = config.icon;
        const isLast = index === activities.length - 1;

        return (
          <div key={activity.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={clsx('flex h-8 w-8 items-center justify-center rounded-full', config.color)}>
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-1" />}
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

export function TicketStatusBanner({ ticket, hasReplies }: TicketStatusBannerProps) {
  // Waiting — no agent yet
  if (ticket.status === 'open' && !ticket.assignedAgentName) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-5 w-5 animate-pulse text-amber-600" />
        </div>
        <div>
          <p className="font-medium text-amber-900">Waiting for support agent</p>
          <p className="mt-1 text-sm text-amber-700">
            Your ticket is in the queue. AI has classified it — an agent will pick it up soon.
            You will see an update here when someone starts handling your ticket.
          </p>
          <p className="mt-2 text-xs text-amber-600">
            Expected response by: {new Date(ticket.slaDueAt).toLocaleString()}
          </p>
        </div>
      </div>
    );
  }

  // Agent assigned but no reply yet
  if (ticket.assignedAgentName && !hasReplies && ticket.status !== 'resolved' && ticket.status !== 'closed') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
          <Headphones className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="font-medium text-emerald-900">
            {ticket.assignedAgentName} is handling your ticket
          </p>
          <p className="mt-1 text-sm text-emerald-700">
            Session started — your agent has been assigned and will reply shortly.
            Stay on this page or check back; you will see the reply below.
          </p>
        </div>
      </div>
    );
  }

  // Agent replied — active conversation
  if (hasReplies && ticket.status === 'in_progress') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100">
          <MessageSquare className="h-5 w-5 text-brand-600" />
        </div>
        <div>
          <p className="font-medium text-brand-900">Conversation in progress</p>
          <p className="mt-1 text-sm text-brand-700">
            {ticket.assignedAgentName} has replied. You can continue the conversation below.
          </p>
        </div>
      </div>
    );
  }

  // Resolved
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
        <div>
          <p className="font-medium text-emerald-900">This ticket is {ticket.status}</p>
          <p className="mt-1 text-sm text-emerald-700">No further action needed unless you have a follow-up.</p>
        </div>
      </div>
    );
  }

  return null;
}

interface TicketConversationProps {
  comments: TicketComment[];
  ticket: Ticket;
}

export function TicketConversation({ comments, ticket }: TicketConversationProps) {
  const canReply = ticket.status === 'open' || ticket.status === 'in_progress';

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-slate-900">Conversation</h4>

      {comments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center">
          <Clock className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-2 text-sm font-medium text-slate-500">No replies yet</p>
          <p className="text-xs text-slate-400">You will be notified when an agent responds</p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {c.senderName.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-slate-800">{c.senderName}</span>
                  <span className="rounded bg-brand-50 px-1.5 py-0.5 text-xs text-brand-600">Support Agent</span>
                </div>
                <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {canReply && (
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <textarea
            placeholder="Write a follow-up message..."
            className="w-full resize-none rounded-lg border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
            rows={2}
          />
          <div className="mt-2 flex justify-end">
            <button className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
              Send Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
