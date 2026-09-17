import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchTicketActivities,
  fetchTicketComments,
  fetchTickets,
  postTicketComment,
} from '../../lib/api';
import { TicketList } from '../../components/tickets/TicketCard';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TicketTimeline, TicketStatusBanner, TicketConversation } from '../../components/tickets/TicketTimeline';
import type { Ticket, TicketActivity, TicketComment } from '../../types';

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

  const filtered = filter === 'all' ? tickets : tickets.filter((t) => t.status === filter);
  const waitingCount = tickets.filter((t) => t.status === 'open' && !t.assignedAgentId).length;

  const handleSelect = (ticket: Ticket) => {
    setSelected(ticket);
    setReplyText('');
    setMobileShowDetail(true);
  };

  const handleSendReply = async () => {
    if (!selected || !replyText.trim()) return;
    setSending(true);
    setError('');
    try {
      const comment = await postTicketComment(selected.id, replyText.trim());
      setComments((prev) => [...prev, comment]);
      setReplyText('');
      const nextActivities = await fetchTicketActivities(selected.id);
      setActivities(nextActivities);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

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
