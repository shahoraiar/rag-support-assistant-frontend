import { useEffect, useState } from 'react';
import { Bot, Headphones } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ChatWindow } from '../../components/chat/ChatWindow';
import {
  createChatSession,
  escalateChatSession,
  fetchChatSessions,
  sendChatMessage,
  type ChatSessionApi,
} from '../../lib/api';
import { mapChatMessage } from '../../lib/chat';
import type { ChatMessage } from '../../types';
import { Button } from '../../components/ui/Button';

export function CustomerChatPage() {
  const { user } = useAuth();
  const [session, setSession] = useState<ChatSessionApi | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const sessions = await fetchChatSessions();
        const existing = sessions.find((s) => s.is_ai_handled)
          || sessions.find((s) => !s.is_ai_handled)
          || null;
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

  const appendResponse = (response: Awaited<ReturnType<typeof sendChatMessage>>) => {
    setMessages((prev) => {
      const next = [...prev, mapChatMessage(response.user_message)];
      if (response.ai_message) next.push(mapChatMessage(response.ai_message));
      if (response.system_message) next.push(mapChatMessage(response.system_message));
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
    setTyping(true);
    setError('');
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
      if (response.system_message) {
        setMessages((prev) => [...prev, mapChatMessage(response.system_message!)]);
      }
      setSession((prev) => prev ? {
        ...prev,
        is_ai_handled: false,
        ticket_id: response.ticket_id,
        escalated_to_agent_name: response.agent_name || null,
      } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Escalation failed');
    } finally {
      setTyping(false);
    }
  };

  const isEscalated = session && !session.is_ai_handled;

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
              ? `Connected with ${session?.escalated_to_agent_name || 'support'}. Ticket ${session?.ticket_id || ''}`
              : 'Ask questions — AI answers from knowledge base, or connect to a human agent'}
          </p>
        </div>
        {!isEscalated && (
          <Button variant="secondary" className="w-full sm:w-auto" onClick={handleEscalate} disabled={typing || loading}>
            Talk to human
          </Button>
        )}
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
            placeholder={
              isEscalated
                ? 'Message the agent...'
                : 'Ask about refunds, billing, account...'
            }
            disabled={typing}
          />
        )}
      </div>

      {typing && (
        <p className="text-center text-sm text-slate-400">
          {isEscalated ? 'Sending...' : 'AI is searching knowledge base...'}
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
