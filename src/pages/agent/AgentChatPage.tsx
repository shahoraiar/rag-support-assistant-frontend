import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
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

  const { connected, status, peerTyping, sendMessage, sendTyping, sendSeen } = useChatSocket({
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
  }, [loadSessions]);

  // Keep discovering new escalations + sync messages
  useEffect(() => {
    const id = window.setInterval(() => {
      loadSessions(activeIdRef.current, true);
    }, 4000);
    return () => window.clearInterval(id);
  }, [loadSessions]);

  useEffect(() => {
    if (!activeId || !connected) return;
    sendSeen();
  }, [activeId, connected, messages.length, sendSeen]);

  // Extra per-session sync while open
  useEffect(() => {
    if (!activeId) return;
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
    }, 4000);
    return () => window.clearInterval(id);
  }, [activeId]);

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
  const liveLabel =
    status === 'live' ? 'Live' : status === 'connecting' ? 'Connecting…' : status === 'error' ? 'Reconnecting…' : '';

  return (
    <div className="flex min-h-0 flex-col space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Live Chat</h1>
        <p className="text-sm text-slate-500 sm:text-base">
          Escalated conversations from AI
          {activeId && liveLabel ? ` · ${liveLabel}` : ''}
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex min-h-[60dvh] flex-col gap-4 lg:grid lg:min-h-[calc(100dvh-12rem)] lg:grid-cols-4">
        <div className={`space-y-2 overflow-y-auto lg:col-span-1 ${mobileShowChat ? 'hidden lg:block' : ''}`}>
          {loading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : sessions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelect(s.id)}
              className={clsx(
                'w-full rounded-lg border p-3 text-left text-sm transition',
                activeId === s.id ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
            >
              <p className="font-medium text-slate-900">{s.customer_name}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {s.messages[s.messages.length - 1]?.content}
              </p>
              {s.ticket_id && <span className="mt-1 inline-block text-xs text-brand-600">{s.ticket_id}</span>}
            </button>
          ))}
          {!loading && !sessions.length && (
            <p className="text-sm text-slate-400">No escalated chats yet. Waiting for customers…</p>
          )}
        </div>

        <div className={`flex min-h-[50dvh] flex-col lg:col-span-3 ${!mobileShowChat ? 'hidden lg:flex' : 'flex'}`}>
          {activeSession ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="mb-2 self-start lg:hidden"
                onClick={() => setMobileShowChat(false)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to chats
              </Button>
              <ChatWindow
                messages={messages}
                onSend={handleSend}
                viewerRole="agent"
                peerTypingLabel={peerTypingLabel}
                onTypingChange={sendTyping}
                placeholder="Reply as agent..."
                disabled={sending}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-400">
              No escalated chats
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
