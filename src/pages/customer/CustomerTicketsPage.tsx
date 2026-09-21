import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Bell, Inbox, MessageSquarePlus, Plus, Ticket as TicketIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  fetchTicketActivities,
  fetchTicketComments,
  fetchTickets,
  postTicketComment,
} from '../../lib/api';
import { useTicketSocket, type TicketCommentSocketPayload } from '../../lib/useTicketSocket';
import { TicketList } from '../../components/tickets/TicketCard';
import { Button } from '../../components/ui/Button';
import { TicketStatusBanner, TicketConversation } from '../../components/tickets/TicketTimeline';
import type { Ticket, TicketActivity, TicketComment } from '../../types';

function mapSocketComment(message: TicketCommentSocketPayload, ticketId: string): TicketComment {
  return {
    id: String(message.id),
    ticketId,
    senderId: String(message.sender_id),
    senderName: message.sender_name,
    content: message.content,
    isInternal: message.is_internal,
    createdAt: message.created_at,
    seenAt: message.seen_at ?? null,
  };
}

export function CustomerTicketsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkTicketId = searchParams.get('ticket');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [filter, setFilter] = useState<string>('active');
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentUserId = user?.id ? Number(user.id) : null;

  const upsertComment = useCallback((message: TicketCommentSocketPayload) => {
    if (!selected) return;
    if (message.is_internal) return;
    const mapped = mapSocketComment(message, selected.id);
    setComments((prev) => {
      if (prev.some((c) => c.id === mapped.id)) {
        return prev.map((c) => (c.id === mapped.id ? { ...c, ...mapped } : c));
      }
      return [...prev, mapped];
    });
  }, [selected]);

  const applySeen = useCallback((messageIds: number[], seenAt: string) => {
    const idSet = new Set(messageIds.map(String));
    setComments((prev) => prev.map((c) => (idSet.has(c.id) ? { ...c, seenAt } : c)));
  }, []);

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await fetchTickets();
      setTickets(data);
      setSelected((current) => {
        const fromLink = deepLinkTicketId
          ? data.find((t) => t.id === deepLinkTicketId)
          : undefined;
        if (fromLink) return fromLink;
        const active = data.filter((t) => t.status === 'open' || t.status === 'in_progress');
        if (current) {
          const fresh = data.find((t) => t.id === current.id);
          if (fresh) return fresh;
        }
        return active[0] || data[0] || null;
      });
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Failed to load tickets');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [deepLinkTicketId]);

  useEffect(() => {
    loadTickets(false);
    const onVis = () => {
      if (document.visibilityState === 'visible') loadTickets(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadTickets]);

  useEffect(() => {
    if (!deepLinkTicketId || tickets.length === 0) return;
    const match = tickets.find((t) => t.id === deepLinkTicketId);
    if (!match) return;
    setSelected(match);
    // Keep under Active so conversation pane stays visible after create
    setFilter('active');
    setMobileShowDetail(true);
    setSearchParams({}, { replace: true });
  }, [deepLinkTicketId, tickets, setSearchParams]);

  const handleTicketUpdated = useCallback((ticket: Ticket) => {
    setTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
    setSelected((current) => (current?.id === ticket.id ? ticket : current));
    fetchTicketActivities(ticket.id)
      .then(setActivities)
      .catch(() => undefined);
  }, []);

  const { connected, peerTyping, sendMessage, sendTyping, sendSeen } = useTicketSocket({
    ticketUid: selected?.id ?? null,
    currentUserId,
    onMessage: upsertComment,
    onSeen: applySeen,
    onTicketUpdated: handleTicketUpdated,
    onError: (detail) => setError(detail),
  });

  useEffect(() => {
    if (!selected) {
      setComments([]);
      setActivities([]);
      return;
    }

    let cancelled = false;
    async function loadDetail() {
      try {
        const [nextComments, nextActivities] = await Promise.all([
          fetchTicketComments(selected!.id),
          fetchTicketActivities(selected!.id),
        ]);
        if (!cancelled) {
          setComments(nextComments);
          setActivities(nextActivities);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load ticket details');
        }
      }
    }

    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  useEffect(() => {
    if (!connected) return;
    sendSeen();
  }, [connected, comments.length, sendSeen]);

  // REST backup only when live WS is down
  useEffect(() => {
    if (!selected?.id || connected) return;
    const id = window.setInterval(async () => {
      try {
        const next = await fetchTicketComments(selected.id);
        setComments((prev) => {
          const byId = new Map(prev.map((c) => [c.id, c]));
          for (const c of next) {
            const existing = byId.get(c.id);
            byId.set(c.id, existing ? { ...existing, ...c } : c);
          }
          return Array.from(byId.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        });
      } catch {
        // ignore
      }
    }, 15000);
    return () => window.clearInterval(id);
  }, [selected?.id, connected]);

  const filtered =
    filter === 'active'
      ? tickets.filter((t) => t.status === 'open' || t.status === 'in_progress')
      : filter === 'closed'
        ? tickets.filter((t) => t.status === 'resolved' || t.status === 'closed')
        : tickets.filter((t) => t.status === filter);

  const counts = {
    active: tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    closed: tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length,
  };
  const waitingCount = tickets.filter((t) => t.status === 'open' && !t.assignedAgentId).length;

  const filterTabs = [
    { key: 'active', label: 'Active', count: counts.active },
    { key: 'open', label: 'Open', count: counts.open },
    { key: 'in_progress', label: 'In Progress', count: counts.in_progress },
    { key: 'closed', label: 'Closed', count: counts.closed },
  ] as const;

  const handleSelect = (ticket: Ticket) => {
    setSelected(ticket);
    setReplyText('');
    setMobileShowDetail(true);
  };

  const handleSendReply = async () => {
    if (!selected || !replyText.trim()) return;
    if (selected.status === 'resolved' || selected.status === 'closed') {
      setError('This ticket is resolved — replies are closed');
      return;
    }
    if (!selected.assignedAgentId) {
      setError('Please wait until an agent accepts your ticket');
      return;
    }
    const text = replyText.trim();
    setSending(true);
    setError('');
    sendTyping(false);
    try {
      const ok = sendMessage(text);
      if (!ok) {
        const comment = await postTicketComment(selected.id, text);
        setComments((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]));
      }
      setReplyText('');
      const nextActivities = await fetchTicketActivities(selected.id);
      setActivities(nextActivities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const peerTypingLabel = peerTyping?.isTyping
    ? `${peerTyping.name || 'Agent'} is typing…`
    : null;

  // Conversation stays open for chat only after an agent accepts
  const agentAccepted = Boolean(selected?.assignedAgentId);
  const canReply =
    agentAccepted &&
    selected?.status !== 'resolved' &&
    selected?.status !== 'closed';

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col gap-4">
      <div className="shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-brand-50/40 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/25">
                <TicketIcon className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  My Tickets
                </h1>
                <p className="text-sm text-slate-500">
                  {counts.active} active · {tickets.length} total
                  {waitingCount > 0 ? ` · ${waitingCount} waiting` : ''}
                </p>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {waitingCount > 0 && (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
                <Bell className="h-3.5 w-3.5" />
                {waitingCount} waiting for agent
              </div>
            )}
            <Link to="/customer/new-ticket" className="w-full sm:w-auto">
              <Button className="w-full gap-1.5 shadow-sm shadow-brand-600/20 sm:w-auto">
                <Plus className="h-4 w-4" />
                New Ticket
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-0.5">
          {filterTabs.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                filter === f.key
                  ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/25'
                  : 'border border-slate-200/80 bg-white/80 text-slate-600 hover:border-brand-200 hover:text-brand-700'
              }`}
            >
              {f.label}
              <span
                className={`ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                  filter === f.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {loading && <p className="shrink-0 text-sm text-slate-500">Loading tickets…</p>}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5 lg:gap-5">
        <div
          className={`min-h-0 overflow-y-auto lg:col-span-2 ${mobileShowDetail ? 'hidden lg:block' : ''}`}
        >
          {filtered.length === 0 && !loading ? (
            <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                <Inbox className="h-7 w-7" />
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-700">No tickets here yet</p>
              <p className="mt-1 max-w-xs text-xs text-slate-400">
                Create a support request and track replies in one place.
              </p>
              <Link to="/customer/new-ticket" className="mt-5">
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  New Ticket
                </Button>
              </Link>
            </div>
          ) : (
            <TicketList
              tickets={filtered}
              onSelect={handleSelect}
              selectedId={selected?.id}
              emptyMessage="No tickets found"
            />
          )}
        </div>

        <div
          className={`min-h-0 lg:col-span-3 ${!mobileShowDetail ? 'hidden lg:flex' : 'flex'} flex-col`}
        >
          {selected && filtered.some((t) => t.id === selected.id) ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="shrink-0 border-b border-slate-100 px-3 py-2 lg:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileShowDetail(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to tickets
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <TicketConversation
                  comments={comments}
                  ticket={selected}
                  replyText={replyText}
                  onReplyTextChange={canReply ? setReplyText : undefined}
                  onSendReply={canReply ? handleSendReply : undefined}
                  sending={sending}
                  currentUserId={user?.id}
                  peerTypingLabel={canReply ? peerTypingLabel : null}
                  liveStatus={canReply && connected ? 'Live' : null}
                  onTypingChange={canReply ? sendTyping : undefined}
                  activities={activities}
                  emptyHint={
                    agentAccepted
                      ? 'You will be notified when an agent responds'
                      : 'Your message is in the conversation. Chat opens when an agent accepts.'
                  }
                  beforeComposer={
                    !agentAccepted && selected.status !== 'resolved' && selected.status !== 'closed' ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                        Waiting for an agent to accept. Your conversation will open for replies as
                        soon as they join.
                      </div>
                    ) : undefined
                  }
                  statusSlot={
                    <TicketStatusBanner
                      ticket={selected}
                      hasReplies={comments.length > 0}
                    />
                  }
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-gradient-to-b from-white to-slate-50 px-6 text-center shadow-sm">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <MessageSquarePlus className="h-7 w-7" />
              </span>
              <p className="mt-4 text-sm font-semibold text-slate-700">
                {loading
                  ? 'Loading…'
                  : filtered.length === 0
                    ? 'Start with a new ticket'
                    : 'Select a ticket'}
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-400">
                {filtered.length === 0
                  ? 'Open a conversation with support — we will route it to an available agent.'
                  : 'Pick a ticket from the list to view the conversation and replies.'}
              </p>
              {filtered.length === 0 && !loading && (
                <Link to="/customer/new-ticket" className="mt-5">
                  <Button className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    New Ticket
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
