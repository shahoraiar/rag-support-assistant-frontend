import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import clsx from 'clsx';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { Button } from '../../components/ui/Button';
import { fetchChatSessions, sendChatMessage, type ChatSessionApi } from '../../lib/api';
import { mapChatMessage } from '../../lib/chat';
import type { ChatMessage } from '../../types';

export function AgentChatPage() {
  const [sessions, setSessions] = useState<ChatSessionApi[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const loadSessions = async (selectId?: number) => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchChatSessions();
      const escalated = data.filter((s) => !s.is_ai_handled);
      setSessions(escalated);
      const nextId = selectId ?? activeId ?? escalated[0]?.id ?? null;
      setActiveId(nextId);
      const active = escalated.find((s) => s.id === nextId);
      setMessages(active ? active.messages.map(mapChatMessage) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleSelect = (id: number) => {
    setActiveId(id);
    setMobileShowChat(true);
    const active = sessions.find((s) => s.id === id);
    setMessages(active ? active.messages.map(mapChatMessage) : []);
  };

  const handleSend = async (text: string) => {
    if (!activeId) return;
    setSending(true);
    setError('');
    try {
      const response = await sendChatMessage(activeId, text);
      setMessages((prev) => {
        const next = [...prev, mapChatMessage(response.user_message)];
        if (response.system_message) next.push(mapChatMessage(response.system_message));
        return next;
      });
      await loadSessions(activeId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeId);

  return (
    <div className="flex min-h-0 flex-col space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Live Chat</h1>
        <p className="text-sm text-slate-500 sm:text-base">Escalated conversations from AI</p>
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
            <p className="text-sm text-slate-400">No escalated chats yet.</p>
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
