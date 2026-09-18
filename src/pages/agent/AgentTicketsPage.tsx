import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  assignTicket,
  fetchTicketComments,
  fetchTickets,
  postTicketComment,
  resolveTicket,
} from '../../lib/api';
import { useTicketSocket, type TicketCommentSocketPayload } from '../../lib/useTicketSocket';
import { TicketList } from '../../components/tickets/TicketCard';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import type { Ticket, TicketComment } from '../../types';

const aiSuggestions: Record<string, string> = {
  billing: 'I can see the duplicate charge in our system. I am initiating a refund — it should reflect in 3-5 business days.',
  technical: 'We identified the root cause and are deploying a fix. I will update you once the service is restored.',
  account: 'Let me verify your account and reset the authentication settings. Please check your email for a verification link.',
  general: 'Thank you for reaching out. Based on our documentation, here is how you can resolve this...',
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [reply, setReply] = useState('');
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const currentUserId = user?.id ? Number(user.id) : null;
  const typingIdleRef = useRef<number | null>(null);

  const upsertComment = useCallback((message: TicketCommentSocketPayload) => {
    if (!selected) return;
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
      return;
    }

    let cancelled = false;
    async function loadComments() {
      try {
        const data = await fetchTicketComments(selected!.id);
        if (!cancelled) setComments(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load conversation');
        }
      }
    }

    loadComments();
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  useEffect(() => {
    if (!connected) return;
    sendSeen();
  }, [connected, comments.length, sendSeen]);

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

  const suggestion = selected ? aiSuggestions[selected.category] : '';
  const isUnassigned = Boolean(selected && !selected.assignedAgentId);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign ticket');
    } finally {
      setBusy(false);
    }
  };

  const handleSendReply = async () => {
    if (!selected || !reply.trim()) return;
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
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      if (!selected.assignedAgentId) {
        await assignTicket(selected.id);
      }
      const updated = await resolveTicket(selected.id);
      setSelected(updated);
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve ticket');
    } finally {
      setBusy(false);
    }
  };

  const liveLabel =
    status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting…' : status === 'error' ? 'Reconnecting…' : '';
  const peerTypingLabel = peerTyping?.isTyping
    ? `${peerTyping.name || 'Customer'} is typing…`
    : null;

  const handleReplyChange = (value: string) => {
    setReply(value);
    sendTyping(true);
    if (typingIdleRef.current) window.clearTimeout(typingIdleRef.current);
    typingIdleRef.current = window.setTimeout(() => sendTyping(false), 1200);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Assigned Tickets</h1>
        <p className="text-sm text-slate-500 sm:text-base">
          {tickets.length} tickets in your queue (assigned + open unassigned)
          {selected && liveLabel ? ` · ${liveLabel}` : ''}
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Loading tickets…</p>}

      <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
        <div className={`lg:col-span-2 ${mobileShowDetail ? 'hidden lg:block' : ''}`}>
          <TicketList tickets={tickets} onSelect={handleSelect} showCustomer />
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

              <Card title={selected.subject} subtitle={`${selected.id} — ${selected.customerName}`}>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge label={selected.status.replace('_', ' ')} variant="status" value={selected.status} />
                  <Badge label={selected.priority} variant="priority" value={selected.priority} />
                  {selected.aiClassification && (
                    <Badge label={`Sentiment: ${selected.aiClassification.sentiment}`} />
                  )}
                  {isUnassigned && <Badge label="Unassigned" />}
                </div>
                <p className="text-sm text-slate-600">{selected.description}</p>
                {isUnassigned && (
                  <Button className="mt-4" onClick={handleAssign} disabled={busy}>
                    Accept ticket
                  </Button>
                )}
              </Card>

              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                  <Sparkles className="h-4 w-4 shrink-0" />
                  AI Suggested Reply
                </div>
                <p className="mt-2 text-sm text-purple-900">{suggestion}</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => setReply(suggestion)}>
                  Use Suggestion
                </Button>
              </div>

              <Card title="Conversation">
                <div className="mb-2 flex justify-end">
                  {liveLabel && <span className="text-xs font-medium text-emerald-600">{liveLabel}</span>}
                </div>
                <div className="mb-4 max-h-48 space-y-2 overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className={`rounded-lg p-3 text-sm ${c.isInternal ? 'border border-amber-100 bg-amber-50' : 'bg-slate-50'}`}>
                      <div className="flex flex-col gap-1 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          {c.senderName}
                          {c.senderId === user?.id ? ' (you)' : ''}
                          {c.isInternal && ' (internal)'}
                        </span>
                        <span className="shrink-0">{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-slate-700">{c.content}</p>
                      {c.senderId === user?.id && c.seenAt && (
                        <p className="mt-1 text-right text-xs font-medium text-brand-600">Seen</p>
                      )}
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-slate-400">No replies yet</p>
                  )}
                </div>
                {peerTypingLabel && (
                  <p className="mb-2 text-xs italic text-slate-400">{peerTypingLabel}</p>
                )}
                <Textarea
                  label="Reply to customer"
                  value={reply}
                  onChange={(e) => handleReplyChange(e.target.value)}
                  placeholder="Type your reply..."
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button className="w-full sm:w-auto" onClick={handleSendReply} disabled={busy || !reply.trim()}>
                    {busy ? 'Working…' : 'Send Reply'}
                  </Button>
                  <Button variant="secondary" className="w-full sm:w-auto" onClick={handleResolve} disabled={busy}>
                    Mark Resolved
                  </Button>
                </div>
              </Card>
            </>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400 sm:h-64">
              {loading ? 'Loading…' : 'No tickets in queue'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
