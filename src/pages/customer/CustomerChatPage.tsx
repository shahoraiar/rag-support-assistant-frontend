import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Headphones,
  RotateCcw,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ChatWindow } from '../../components/chat/ChatWindow';
import {
  createChatSession,
  escalateChatSession,
  fetchChatSessions,
  sendChatMessage,
  type ChatMessageApi,
  type ChatSessionApi,
} from '../../lib/api';
import { mapChatMessage } from '../../lib/chat';
import type { ChatMessage } from '../../types';
import { Button } from '../../components/ui/Button';

const AI_CHAT_SUGGESTIONS = [
  'What is the billing grace period?',
  'How do refunds work for duplicate payment?',
  'Who is responsible for my Wi-Fi router?',
  'What personal data do you collect?',
  'How long does installation take?',
];

/** Prefer an active AI session; escalated chats are closed here (continue on My Tickets). */
function pickCustomerSession(sessions: ChatSessionApi[]): ChatSessionApi | null {
  if (!sessions.length) return null;
  const aiActive = sessions.filter((s) => s.is_ai_handled).sort((a, b) => b.id - a.id);
  if (aiActive.length) return aiActive[0];
  return sessions.sort((a, b) => b.id - a.id)[0];
}

export function CustomerChatPage() {
  const { user } = useAuth();
  const [session, setSession] = useState<ChatSessionApi | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isEscalated = Boolean(session && !session.is_ai_handled);
  const ticketUid = session?.ticket_id || null;
  const ticketsHref = ticketUid
    ? `/customer/tickets?ticket=${encodeURIComponent(ticketUid)}`
    : '/customer/tickets';

  const upsertMessage = useCallback((apiMessage: ChatMessageApi) => {
    const mapped = mapChatMessage(apiMessage);
    setMessages((prev) => {
      if (prev.some((m) => m.id === mapped.id)) {
        return prev.map((m) => (m.id === mapped.id ? { ...m, ...mapped } : m));
      }
      return [...prev, mapped];
    });
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const sessions = await fetchChatSessions();
        const existing = pickCustomerSession(sessions);
        const nextSession = existing || (await createChatSession());
        if (!active) return;
        setSession(nextSession);
        setMessages(nextSession.messages.map(mapChatMessage));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load chat');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const appendResponse = (
    response: Awaited<ReturnType<typeof sendChatMessage>>,
    pendingId?: string,
  ) => {
    setMessages((prev) => {
      let next = pendingId ? prev.filter((m) => m.id !== pendingId) : [...prev];
      const push = (msg?: ChatMessageApi) => {
        if (!msg) return;
        const mapped = mapChatMessage(msg);
        if (!next.some((m) => m.id === mapped.id)) next = [...next, mapped];
      };
      push(response.user_message);
      push(response.ai_message);
      push(response.system_message);
      return next;
    });
    if (response.escalated) {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              is_ai_handled: false,
              ticket_id: response.ticket_id || prev.ticket_id,
              escalated_to_agent_name: response.agent_name || prev.escalated_to_agent_name,
            }
          : prev,
      );
    }
  };

  const handleSend = async (text: string) => {
    if (!session || isEscalated) return;
    const pendingId = `pending-${Date.now()}`;
    setError('');
    setMessages((prev) => [
      ...prev,
      {
        id: pendingId,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
        seenAt: null,
      },
    ]);
    setTyping(true);
    try {
      const response = await sendChatMessage(session.id, text);
      appendResponse(response, pendingId);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== pendingId));
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setTyping(false);
    }
  };

  const handleEscalate = async () => {
    if (!session || isEscalated) return;
    setTyping(true);
    setError('');
    try {
      const response = await escalateChatSession(session.id);
      setSession((prev) =>
        prev
          ? {
              ...prev,
              is_ai_handled: false,
              ticket_id: response.ticket_id || prev.ticket_id,
              escalated_to_agent_name: response.agent_name || prev.escalated_to_agent_name,
            }
          : prev,
      );
      if (response.system_message) {
        upsertMessage(response.system_message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Escalation failed');
    } finally {
      setTyping(false);
    }
  };

  const handleNewAiChat = async () => {
    setLoading(true);
    setError('');
    try {
      const next = await createChatSession();
      setSession(next);
      setMessages(next.messages.map(mapChatMessage));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start new chat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100dvh-7.5rem)] w-full max-w-4xl flex-col gap-4">
      <div className="shrink-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-brand-50/40 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                AI Support
              </h1>
              <p className="truncate text-sm text-slate-500">
                {session?.chat_uid
                  ? `${session.chat_uid} · Instant answers from your knowledge base`
                  : 'Instant answers from your knowledge base'}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {!isEscalated && (
              <>
                <Button
                  variant="secondary"
                  className="w-full gap-1.5 sm:w-auto"
                  onClick={handleNewAiChat}
                  disabled={typing || loading || !session}
                >
                  <RotateCcw className="h-4 w-4" />
                  End support
                </Button>
                <Button
                  variant="secondary"
                  className="w-full gap-1.5 sm:w-auto"
                  onClick={handleEscalate}
                  disabled={typing || loading || !session}
                >
                  <Headphones className="h-4 w-4" />
                  Talk to human
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="shrink-0 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {isEscalated && !loading && (
        <div className="shrink-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-950">
                AI chat closed — continue on My Tickets
              </p>
              <p className="mt-0.5 text-xs text-amber-800/90">
                {ticketUid
                  ? `Ticket ${ticketUid} was created${
                      session?.escalated_to_agent_name
                        ? ` and assigned to ${session.escalated_to_agent_name}`
                        : ''
                    }. Open My Tickets to view the conversation and reply.`
                  : 'A support ticket was created. Open My Tickets to continue with an agent.'}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link to={ticketsHref}>
                <Button size="sm" className="gap-1.5">
                  <Ticket className="h-3.5 w-3.5" />
                  Open My Tickets
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Button variant="secondary" size="sm" onClick={handleNewAiChat} disabled={loading}>
                New AI chat
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm text-slate-400 shadow-sm">
            Loading chat…
          </div>
        ) : (
          <ChatWindow
            messages={messages}
            onSend={isEscalated ? undefined : handleSend}
            viewerRole="customer"
            sendingHint={typing && !isEscalated ? 'AI is searching knowledge base…' : null}
            title={isEscalated ? 'AI chat ended' : 'Conversation'}
            subtitle={
              isEscalated
                ? [
                    session?.chat_uid,
                    ticketUid ? `Moved to ${ticketUid}` : null,
                    'Replies are closed here',
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'Ask about billing, refunds, account, or request a human'
            }
            headerBadge={
              isEscalated ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  <Headphones className="h-3 w-3" />
                  Handed to human
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  <Bot className="h-3 w-3" />
                  AI assistant
                </span>
              )
            }
            headerActions={
              isEscalated ? (
                <Link to={ticketsHref}>
                  <Button size="sm" className="gap-1.5">
                    <Ticket className="h-3.5 w-3.5" />
                    My Tickets
                  </Button>
                </Link>
              ) : undefined
            }
            systemMessageAction={
              isEscalated ? (
                <Link
                  to={ticketsHref}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  <Ticket className="h-3.5 w-3.5" />
                  {ticketUid ? `Open ${ticketUid} in My Tickets` : 'Open My Tickets'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : undefined
            }
            placeholder="Ask about refunds, billing, account…"
            disabled={typing || isEscalated}
            emptyTitle="How can we help?"
            emptyHint="Pick a suggested question below, or type your own."
            suggestions={isEscalated ? [] : AI_CHAT_SUGGESTIONS}
          />
        )}
      </div>
    </div>
  );
}
