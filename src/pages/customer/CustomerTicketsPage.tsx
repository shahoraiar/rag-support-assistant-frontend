import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchTicketActivities,
  fetchTicketComments,
  fetchTickets,
  postTicketComment,
} from '../../lib/api';
import { useTicketSocket, type TicketCommentSocketPayload } from '../../lib/useTicketSocket';
import { TicketList } from '../../components/tickets/TicketCard';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TicketTimeline, TicketStatusBanner, TicketConversation } from '../../components/tickets/TicketTimeline';
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [filter, setFilter] = useState<string>('all');
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

  const { connected, status, peerTyping, sendMessage, sendTyping, sendSeen } = useTicketSocket({
    ticketUid: selected?.id ?? null,
    currentUserId,
    onMessage: upsertComment,
    onSeen: applySeen,
    onError: (detail) => setError(detail),
  });

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchTickets();
      setTickets(data);
      setSelected((current) => {
        if (!current) return data[0] || null;
        return data.find((t) => t.id === current.id) || data[0] || null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

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

  // REST backup while ticket is open
  useEffect(() => {
    if (!selected?.id) return;
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
    }, 5000);
    return () => window.clearInterval(id);
  }, [selected?.id]);

  const filtered = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);
  const waitingCount = tickets.filter((t) => t.status === 'open' && !t.assignedAgentId).length;

  const handleSelect = (ticket: Ticket) => {
    setSelected(ticket);
    setReplyText('');
    setMobileShowDetail(true);
  };

  const handleSendReply = async () => {
    if (!selected || !replyText.trim()) return;
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

  const liveLabel =
    status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting…' : status === 'error' ? 'Reconnecting…' : null;
  const peerTypingLabel = peerTyping?.isTyping
    ? `${peerTyping.name || 'Agent'} is typing…`
    : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">My Tickets</h1>
          <p className="text-sm text-slate-500 sm:text-base">{tickets.length} total tickets</p>
        </div>
        {waitingCount > 0 && (
          <div className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:w-auto">
            <Bell className="h-4 w-4 shrink-0" />
            {waitingCount} ticket{waitingCount > 1 ? 's' : ''} waiting for agent
          </div>
        )}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading tickets…</p>}

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
                onClick={() => setMobileShowDetail(false)}
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
                <TicketConversation
                  comments={comments}
                  ticket={selected}
                  replyText={replyText}
                  onReplyTextChange={setReplyText}
                  onSendReply={handleSendReply}
                  sending={sending}
                  currentUserId={user?.id}
                  peerTypingLabel={peerTypingLabel}
                  liveStatus={liveLabel}
                  onTypingChange={sendTyping}
                />
              </Card>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400 sm:h-64">
              {loading ? 'Loading…' : 'Select a ticket to view details'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
