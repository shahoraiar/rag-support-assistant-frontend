import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  assignTicket,
  fetchTicketActivities,
  fetchTicketComments,
  fetchTickets,
  postTicketComment,
  resolveTicket,
} from '../../lib/api';
import { useTicketSocket, type TicketCommentSocketPayload } from '../../lib/useTicketSocket';
import { useAgentQueueSocket } from '../../lib/useAgentQueueSocket';
import { TicketList } from '../../components/tickets/TicketCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { TicketStatusBanner, TicketConversation } from '../../components/tickets/TicketTimeline';
import type { Ticket, TicketActivity, TicketComment } from '../../types';

const aiSuggestions: Record<string, string> = {
  billing:
    'I can see the duplicate charge in our system. I am initiating a refund — it should reflect in 3-5 business days.',
  technical:
    'We identified the root cause and are deploying a fix. I will update you once the service is restored.',
  account:
    'Let me verify your account and reset the authentication settings. Please check your email for a verification link.',
  general:
    'Thank you for reaching out. Based on our documentation, here is how you can resolve this...',
};

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

export function AgentTicketsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const deepLinkTicketId = searchParams.get('ticket');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [reply, setReply] = useState('');
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const currentUserId = user?.id ? Number(user.id) : null;

  const upsertComment = useCallback(
    (message: TicketCommentSocketPayload) => {
      if (!selected) return;
      const mapped = mapSocketComment(message, selected.id);
      setComments((prev) => {
        if (prev.some((c) => c.id === mapped.id)) {
          return prev.map((c) => (c.id === mapped.id ? { ...c, ...mapped } : c));
        }
        return [...prev, mapped];
      });
    },
    [selected],
  );

  const applySeen = useCallback((messageIds: number[], seenAt: string) => {
    const idSet = new Set(messageIds.map(String));
    setComments((prev) => prev.map((c) => (idSet.has(c.id) ? { ...c, seenAt } : c)));
  }, []);

  const handleTicketUpdated = useCallback((ticket: Ticket) => {
    setTickets((prev) => {
      const exists = prev.some((t) => t.id === ticket.id);
      if (!exists) return [ticket, ...prev];
      return prev.map((t) => (t.id === ticket.id ? ticket : t));
    });
    setSelected((current) => (current?.id === ticket.id ? ticket : current));
    fetchTicketActivities(ticket.id)
      .then(setActivities)
      .catch(() => undefined);
  }, []);

  const handleQueueTicketCreated = useCallback((ticket: Ticket) => {
    setTickets((prev) => (prev.some((t) => t.id === ticket.id) ? prev : [ticket, ...prev]));
  }, []);

  const { connected, peerTyping, sendMessage, sendTyping, sendSeen } = useTicketSocket({
    ticketUid: selected?.id ?? null,
    currentUserId,
    onMessage: upsertComment,
    onSeen: applySeen,
    onTicketUpdated: handleTicketUpdated,
    onError: (detail) => setError(detail),
  });

  useAgentQueueSocket({
    enabled: true,
    onTicketCreated: handleQueueTicketCreated,
    onTicketUpdated: handleTicketUpdated,
  });

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await fetchTickets();
      const queue = data.filter((t) => t.status === 'open' || t.status === 'in_progress');
      setTickets(data);
      setSelected((current) => {
        const fromLink = deepLinkTicketId
          ? queue.find((t) => t.id === deepLinkTicketId) ||
            data.find((t) => t.id === deepLinkTicketId)
          : undefined;
        // Prefer active queue; ignore resolved deep-links for the agent queue UI
        if (fromLink && (fromLink.status === 'open' || fromLink.status === 'in_progress')) {
          return fromLink;
        }
        if (current) {
          const fresh = queue.find((t) => t.id === current.id);
          if (fresh) return fresh;
        }
        return queue[0] || null;
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
    setMobileShowDetail(true);
    setSearchParams({}, { replace: true });
  }, [deepLinkTicketId, tickets, setSearchParams]);

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
          setError(err instanceof Error ? err.message : 'Failed to load conversation');
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

  const suggestion = selected
    ? aiSuggestions[selected.category] || aiSuggestions.general
    : aiSuggestions.general;
  const isUnassigned = Boolean(selected && !selected.assignedAgentId);
  const canReply =
    Boolean(selected) && selected!.status !== 'resolved' && selected!.status !== 'closed';

  const handleSelect = (ticket: Ticket) => {
    setSelected(ticket);
    setReply('');
    setMobileShowDetail(true);
  };

  const handleAssign = async () => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const updated = await assignTicket(selected.id);
      setSelected(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      const nextActivities = await fetchTicketActivities(updated.id);
      setActivities(nextActivities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign ticket');
    } finally {
      setBusy(false);
    }
  };

  const handleSendReply = async () => {
    if (!selected || !reply.trim() || !canReply) return;
    const text = reply.trim();
    setBusy(true);
    setError('');
    sendTyping(false);
    try {
      if (!selected.assignedAgentId) {
        const assigned = await assignTicket(selected.id);
        setSelected(assigned);
        setTickets((prev) => prev.map((t) => (t.id === assigned.id ? assigned : t)));
      }
      const ok = sendMessage(text);
      if (!ok) {
        const comment = await postTicketComment(selected.id, text);
        setComments((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]));
      }
      setReply('');
      const refreshed = await fetchTickets();
      setTickets(refreshed);
      setSelected(refreshed.find((t) => t.id === selected.id) || selected);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async () => {
    if (!selected || !canReply) return;
    const resolvedId = selected.id;
    setBusy(true);
    setError('');
    try {
      if (!selected.assignedAgentId) {
        await assignTicket(selected.id);
      }
      await resolveTicket(selected.id);
      setTickets((prev) => {
        const next = prev.filter((t) => t.id !== resolvedId);
        const queue = next.filter((t) => t.status === 'open' || t.status === 'in_progress');
        setSelected(queue[0] || null);
        if (!queue.length) setMobileShowDetail(false);
        return next;
      });
      setReply('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve ticket');
    } finally {
      setBusy(false);
    }
  };

  const peerTypingLabel = peerTyping?.isTyping
    ? `${peerTyping.name || 'Customer'} is typing…`
    : null;

  const queueTickets = tickets
    .filter((t) => t.status === 'open' || t.status === 'in_progress')
    .slice()
    .sort((a, b) => {
      const aUnassigned = !a.assignedAgentId ? 0 : 1;
      const bUnassigned = !b.assignedAgentId ? 0 : 1;
      if (aUnassigned !== bUnassigned) return aUnassigned - bUnassigned;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });

  const unassignedCount = queueTickets.filter((t) => !t.assignedAgentId).length;

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col gap-3 sm:gap-4">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Assigned Tickets</h1>
          <p className="text-sm text-slate-500">
            {queueTickets.length} active
            {unassignedCount > 0 ? ` · ${unassignedCount} need accept` : ''}
          </p>
        </div>
      </div>

      {error && (
        <p className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}
      {loading && <p className="shrink-0 text-sm text-slate-500">Loading tickets…</p>}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5 lg:gap-5">
        <div
          className={`min-h-0 overflow-y-auto lg:col-span-2 ${mobileShowDetail ? 'hidden lg:block' : ''}`}
        >
          <TicketList
            tickets={queueTickets}
            onSelect={handleSelect}
            showCustomer
            selectedId={selected?.id}
            highlightUnassigned
            emptyMessage="No active tickets in your queue"
          />
        </div>

        <div
          className={`min-h-0 lg:col-span-3 ${!mobileShowDetail ? 'hidden lg:flex' : 'flex'} flex-col`}
        >
          {selected ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="shrink-0 border-b border-slate-100 px-3 py-2 lg:hidden">
                <Button variant="ghost" size="sm" onClick={() => setMobileShowDetail(false)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back to tickets
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <TicketConversation
                  comments={comments}
                  ticket={selected}
                  replyText={reply}
                  onReplyTextChange={canReply ? setReply : undefined}
                  onSendReply={canReply ? handleSendReply : undefined}
                  sending={busy}
                  currentUserId={user?.id}
                  peerTypingLabel={canReply ? peerTypingLabel : null}
                  liveStatus={null}
                  onTypingChange={canReply ? sendTyping : undefined}
                  activities={activities}
                  counterpartLabel="Customer"
                  subtitle={selected.customerName}
                  emptyHint="Reply below to start the conversation"
                  statusSlot={
                    <>
                      <TicketStatusBanner ticket={selected} hasReplies={comments.length > 0} />
                      {isUnassigned && <Badge label="Unassigned" />}
                      {isUnassigned && canReply && (
                        <Button size="sm" onClick={handleAssign} disabled={busy}>
                          Accept ticket
                        </Button>
                      )}
                    </>
                  }
                  beforeComposer={
                    canReply ? (
                      <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50/80 p-3">
                        <div className="flex items-center gap-2 text-xs font-semibold text-violet-700">
                          <Sparkles className="h-3.5 w-3.5" />
                          AI Suggested Reply
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-xs text-violet-900">{suggestion}</p>
                        <button
                          type="button"
                          className="mt-2 text-xs font-medium text-violet-700 underline-offset-2 hover:underline"
                          onClick={() => setReply(suggestion)}
                        >
                          Use suggestion
                        </button>
                      </div>
                    ) : null
                  }
                  composerActions={
                    canReply ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleResolve}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Mark Resolved
                      </button>
                    ) : null
                  }
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">
              {loading ? 'Loading…' : 'No tickets in queue'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
