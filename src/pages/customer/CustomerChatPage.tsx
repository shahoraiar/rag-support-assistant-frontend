import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { mockChatSessions } from '../../data/mockData';
import { ChatWindow } from '../../components/chat/ChatWindow';
import type { ChatMessage } from '../../types';
import { Bot } from 'lucide-react';

const aiResponses: Record<string, { answer: string; source?: { title: string; snippet: string } }> = {
  refund: {
    answer: 'According to our Refund Policy, you can request a full refund within 30 days of purchase.',
    source: { title: 'Refund Policy.pdf', snippet: 'Customers may request a full refund within 30 days...' },
  },
  cancel: {
    answer: 'Go to Settings > Billing > Cancel Subscription. Access continues until billing period ends.',
    source: { title: 'FAQ - Billing', snippet: 'Cancel via Settings > Billing...' },
  },
  default: {
    answer: 'Based on our documentation, I can help with billing, account, and technical questions. Could you provide more details?',
  },
};

function getAiReply(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('refund')) return aiResponses.refund;
  if (lower.includes('cancel')) return aiResponses.cancel;
  return aiResponses.default;
}

export function CustomerChatPage() {
  const { user } = useAuth();
  const session = mockChatSessions.find((s) => s.customerId === user?.id && s.isAiHandled);
  const [messages, setMessages] = useState<ChatMessage[]>(session?.messages || []);
  const [typing, setTyping] = useState(false);

  const handleSend = (text: string) => {
    const userMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setTyping(true);

    setTimeout(() => {
      const reply = getAiReply(text);
      const aiMsg: ChatMessage = {
        id: `m-${Date.now() + 1}`,
        role: 'assistant',
        content: reply.answer,
        sources: reply.source ? [reply.source] : undefined,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setTyping(false);
    }, 1200);
  };

  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-3xl flex-col space-y-4 lg:min-h-[calc(100dvh-10rem)]">
      <div>
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6 shrink-0 text-brand-600" />
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">AI Support Chat</h1>
        </div>
        <p className="text-sm text-slate-500 sm:text-base">
          Ask questions — answers come from company knowledge base (RAG demo)
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <ChatWindow
          messages={messages}
          onSend={handleSend}
          placeholder="Ask about refunds, billing, account..."
          disabled={typing}
        />
      </div>

      {typing && (
        <p className="text-center text-sm text-slate-400">AI is searching knowledge base...</p>
      )}

      <div className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-3 text-xs text-brand-700 sm:px-4 sm:text-sm">
        Try: &quot;What is your refund policy?&quot; or &quot;How do I cancel my subscription?&quot;
      </div>
    </div>
  );
}
