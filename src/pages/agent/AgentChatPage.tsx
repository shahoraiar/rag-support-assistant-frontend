import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Headphones, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import {
  fetchChatSession,
  fetchChatSessions,
  sendChatMessage,
  type ChatMessageApi,
  type ChatSessionApi,
} from '../../lib/api';
import { mapChatMessage } from '../../lib/chat';
import { useChatSocket } from '../../lib/useChatSocket';
import type { ChatMessage } from '../../types';

export function AgentChatPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSessionApi[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const activeIdRef = useRef<number | null>(null);

  const currentUserId = user?.id ? Number(user.id) : null;

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const upsertMessage = useCallback((apiMessage: ChatMessageApi) => {
    const mapped = mapChatMessage(apiMessage);
    setMessages((prev) => {
      if (prev.some((m) => m.id === mapped.id)) {
        return prev.map((m) => (m.id === mapped.id ? { ...m, ...mapped } : m));
      }
      return [...prev, mapped];
    });
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeIdRef.current) return s;
        if (s.messages.some((m) => m.id === apiMessage.id)) {
          return {
            ...s,
            messages: s.messages.map((m) => (m.id === apiMessage.id ? { ...m, ...apiMessage } : m)),
          };
        }
        return { ...s, messages: [...s.messages, apiMessage] };
      }),
    );
  }, []);

  const applySeen = useCallback((messageIds: number[], seenAt: string) => {
    const idSet = new Set(messageIds.map(String));
    setMessages((prev) =>
      prev.map((m) => (idSet.has(m.id) ? { ...m, seenAt } : m)),
    );
  }, []);

  const { connected, peerTyping, sendMessage, sendTyping, sendSeen } = useChatSocket({
    sessionId: activeId,
    enabled: Boolean(activeId),
    currentUserId,
    onMessage: upsertMessage,
    onSeen: applySeen,
    onError: (detail) => setError(detail),
  });

  const loadSessions = useCallback(async (selectId?: number | null, soft = false) => {
    if (!soft) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await fetchChatSessions();
      const escalated = data.filter((s) => !s.is_ai_handled).sort((a, b) => b.id - a.id);
      setSessions(escalated);

      const preferred = selectId ?? activeIdRef.current;
      const nextId =
        preferred && escalated.some((s) => s.id === preferred)
          ? preferred
          : escalated[0]?.id ?? null;

      setActiveId(nextId);
      const active = escalated.find((s) => s.id === nextId);
      if (active) {
        setMessages((prev) => {
          if (!soft || prev.length === 0) return active.messages.map(mapChatMessage);
          const byId = new Map(prev.map((m) => [m.id, m]));
          for (const raw of active.messages) {
            const mapped = mapChatMessage(raw);
            const existing = byId.get(mapped.id);
            byId.set(mapped.id, existing ? { ...existing, ...mapped } : mapped);
          }
          return Array.from(byId.values()).sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        });
      } else {
        setMessages([]);
      }
    } catch (err) {
      if (!soft) setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      if (!soft) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        loadSessions(activeIdRef.current, true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadSessions]);

  useEffect(() => {
    if (!activeId || !connected) return;
    sendSeen();
  }, [activeId, connected, messages.length, sendSeen]);

  // REST backup only when live WS is down
  useEffect(() => {
    if (!activeId || connected) return;
    const id = window.setInterval(async () => {
      try {
        const fresh = await fetchChatSession(activeId);
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
        // ignore
      }
    }, 15000);
    return () => window.clearInterval(id);
  }, [activeId, connected]);

  const handleSelect = (id: number) => {
    setActiveId(id);
    setMobileShowChat(true);
    const active = sessions.find((s) => s.id === id);
    setMessages(active ? active.messages.map(mapChatMessage) : []);
  };

  const handleSend = async (text: string) => {
    if (!activeId) return;
    setError('');
    sendTyping(false);

    const ok = sendMessage(text);
    if (ok) return;

    setSending(true);
    try {
      const response = await sendChatMessage(activeId, text);
      upsertMessage(response.user_message);
      if (response.system_message) upsertMessage(response.system_message);
      await loadSessions(activeId, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeId);
  const peerTypingLabel = peerTyping?.isTyping
    ? `${peerTyping.name || 'Customer'} is typing…`
    : null;

  return (
    <div className="flex h-[calc(100dvh-7.5rem)] flex-col gap-3">
      <div className="flex shrink-0 items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Live Chat</h1>
          <p className="text-sm text-slate-500">
            {sessions.length} escalated conversation{sessions.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {error && (
        <p className="shrink-0 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5 lg:gap-5">
        <div
          className={`min-h-0 space-y-2 overflow-y-auto lg:col-span-2 ${mobileShowChat ? 'hidden lg:block' : ''}`}
        >
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            sessions.map((s) => {
              const last = s.messages[s.messages.length - 1];
              const selected = activeId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelect(s.id)}
                  className={clsx(
                    'relative w-full rounded-xl border p-3.5 text-left transition',
                    selected
                      ? 'border-brand-500 bg-brand-50/50 shadow-md ring-2 ring-brand-500/25'
                      : 'border-slate-200 bg-white hover:border-brand-300 hover:shadow-sm',
                  )}
                >
                  {selected && (
                    <span className="absolute inset-y-3 left-0 w-1 rounded-full bg-brand-600" />
                  )}
                  <div className={clsx(selected && 'pl-2')}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium text-slate-900">{s.customer_name}</p>
                      {selected && (
                        <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                          Viewing
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                      {last?.content || 'No messages yet'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-600">{s.chat_uid || `Chat #${s.id}`}</span>
                        {s.ticket_id && (
                          <span className="inline-flex items-center gap-1 font-medium text-brand-600">
                            <MessageSquare className="h-3 w-3" />
                            {s.ticket_id}
                          </span>
                        )}
                      </span>
                      {last?.created_at && (
                        <span>
                          {new Date(last.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
          {!loading && !sessions.length && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
              No escalated chats yet
            </div>
          )}
        </div>

        <div
          className={`min-h-0 lg:col-span-3 ${!mobileShowChat ? 'hidden lg:flex' : 'flex'} flex-col`}
        >
          {activeSession ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 pb-2 lg:hidden">
                <Button variant="ghost" size="sm" onClick={() => setMobileShowChat(false)}>
                  <ArrowLeft className="h-4 w-4" />
                  Back to chats
                </Button>
              </div>
              <div className="min-h-0 flex-1">
                <ChatWindow
                  messages={messages}
                  onSend={handleSend}
                  viewerRole="agent"
                  peerTypingLabel={peerTypingLabel}
                  onTypingChange={sendTyping}
                  title={activeSession.customer_name}
                  subtitle={[
                    activeSession.chat_uid || `Chat #${activeSession.id}`,
                    activeSession.ticket_id ? `Ticket ${activeSession.ticket_id}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  headerBadge={
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      <Headphones className="h-3 w-3" />
                      Agent chat
                    </span>
                  }
                  placeholder="Reply as agent…"
                  disabled={sending}
                  emptyTitle="No messages yet"
                  emptyHint="Send the first reply to the customer."
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400">
              {loading ? 'Loading…' : 'Select a chat to reply'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
