import { useCallback, useEffect, useState } from 'react';
import { Bot, Headphones } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ChatWindow } from '../../components/chat/ChatWindow';
import {
  createChatSession,
  escalateChatSession,
  fetchChatSession,
  fetchChatSessions,
  sendChatMessage,
  type ChatMessageApi,
  type ChatSessionApi,
} from '../../lib/api';
import { mapChatMessage } from '../../lib/chat';
import { useChatSocket } from '../../lib/useChatSocket';
import type { ChatMessage } from '../../types';
import { Button } from '../../components/ui/Button';

function pickCustomerSession(sessions: ChatSessionApi[]): ChatSessionApi | null {
  if (!sessions.length) return null;
  // Prefer live escalated chat so WebSocket actually connects
  const escalated = sessions.filter((s) => !s.is_ai_handled);
  if (escalated.length) {
    return escalated.sort((a, b) => b.id - a.id)[0];
  }
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
  const currentUserId = user?.id ? Number(user.id) : null;

  const upsertMessage = useCallback((apiMessage: ChatMessageApi) => {
    const mapped = mapChatMessage(apiMessage);
    setMessages((prev) => {
      if (prev.some((m) => m.id === mapped.id)) {
        return prev.map((m) => (m.id === mapped.id ? { ...m, ...mapped } : m));
      }
      return [...prev, mapped];
    });
  }, []);

  const applySeen = useCallback((messageIds: number[], seenAt: string) => {
    const idSet = new Set(messageIds.map(String));
    setMessages((prev) =>
      prev.map((m) => (idSet.has(m.id) ? { ...m, seenAt } : m)),
    );
  }, []);

  const { connected, status, peerTyping, sendMessage, sendTyping, sendSeen } = useChatSocket({
    sessionId: session?.id ?? null,
    enabled: isEscalated,
    currentUserId,
    onMessage: upsertMessage,
    onSeen: applySeen,
    onError: (detail) => setError(detail),
  });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const sessions = await fetchChatSessions();
        const existing = pickCustomerSession(sessions);
        const nextSession = existing || await createChatSession();
        if (!active) return;
        setSession(nextSession);
        setMessages(nextSession.messages.map(mapChatMessage));
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load chat');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.id]);

  // REST backup sync while live (covers missed WS frames)
  useEffect(() => {
    if (!isEscalated || !session?.id) return;
    const id = window.setInterval(async () => {
      try {
        const fresh = await fetchChatSession(session.id);
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          for (const raw of fresh.messages) {
            const mapped = mapChatMessage(raw);
            const existing = byId.get(mapped.id);
            byId.set(mapped.id, existing ? { ...existing, ...mapped } : mapped);
          }
          return Array.from(byId.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        });
      } catch {
        // ignore transient poll errors
      }
    }, 4000);
    return () => window.clearInterval(id);
  }, [isEscalated, session?.id]);

  useEffect(() => {
    if (!isEscalated || !connected) return;
    sendSeen();
  }, [isEscalated, connected, messages.length, sendSeen]);

  const appendResponse = (response: Awaited<ReturnType<typeof sendChatMessage>>) => {
    setMessages((prev) => {
      const next = [...prev];
      const push = (msg?: ChatMessageApi) => {
        if (!msg) return;
        const mapped = mapChatMessage(msg);
        if (!next.some((m) => m.id === mapped.id)) next.push(mapped);
      };
      push(response.user_message);
      push(response.ai_message);
      push(response.system_message);
      return next;
    });
    if (response.escalated) {
      setSession((prev) => prev ? {
        ...prev,
        is_ai_handled: false,
        ticket_id: response.ticket_id || prev.ticket_id,
        escalated_to_agent_name: response.agent_name || prev.escalated_to_agent_name,
      } : prev);
    }
  };

  const handleSend = async (text: string) => {
    if (!session) return;
    setError('');

    if (isEscalated) {
      sendTyping(false);
      const ok = sendMessage(text);
      if (!ok) {
        setTyping(true);
        try {
          const response = await sendChatMessage(session.id, text);
          appendResponse(response);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
          setTyping(false);
        }
      }
      return;
    }

    setTyping(true);
    try {
      const response = await sendChatMessage(session.id, text);
      appendResponse(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setTyping(false);
    }
  };

  const handleEscalate = async () => {
    if (!session) return;
    setTyping(true);
    setError('');
    try {
      const response = await escalateChatSession(session.id);
      const fresh = await fetchChatSession(session.id);
      setSession(fresh);
      setMessages(fresh.messages.map(mapChatMessage));
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

  const peerTypingLabel = peerTyping?.isTyping
    ? `${peerTyping.name || 'Agent'} is typing…`
    : null;

  const liveLabel =
    status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting…' : status === 'error' ? 'Reconnecting…' : '';

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-3xl flex-col space-y-4 lg:min-h-[calc(100dvh-10rem)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {isEscalated ? (
              <Headphones className="h-6 w-6 shrink-0 text-emerald-600" />
            ) : (
              <Bot className="h-6 w-6 shrink-0 text-brand-600" />
            )}
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
              {isEscalated ? 'Live Agent Chat' : 'AI Support Chat'}
            </h1>
          </div>
          <p className="text-sm text-slate-500 sm:text-base">
            {isEscalated
              ? `Connected with ${session?.escalated_to_agent_name || 'support'}. Ticket ${session?.ticket_id || ''}${liveLabel ? ` · ${liveLabel}` : ''}`
              : 'Ask questions — AI answers from knowledge base, or connect to a human agent'}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {isEscalated && (
            <Button variant="secondary" className="w-full sm:w-auto" onClick={handleNewAiChat} disabled={loading}>
              New AI chat
            </Button>
          )}
          {!isEscalated && (
            <Button variant="secondary" className="w-full sm:w-auto" onClick={handleEscalate} disabled={typing || loading}>
              Talk to human
            </Button>
          )}
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
            Loading chat...
          </div>
        ) : (
          <ChatWindow
            messages={messages}
            onSend={handleSend}
            viewerRole="customer"
            peerTypingLabel={peerTypingLabel}
            onTypingChange={isEscalated ? sendTyping : undefined}
            placeholder={
              isEscalated
                ? 'Message the agent...'
                : 'Ask about refunds, billing, account...'
            }
            disabled={typing}
          />
        )}
      </div>

      {typing && !isEscalated && (
        <p className="text-center text-sm text-slate-400">
          AI is searching knowledge base...
        </p>
      )}

      {!isEscalated && (
        <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-3 text-xs text-brand-700 sm:px-4 sm:text-sm">
          Try: &quot;What is your refund policy?&quot; or say &quot;I want to talk to a human agent&quot; to escalate.
        </div>
      )}
    </div>
  );
}
