import { useState } from 'react';
import { mockChatSessions } from '../../data/mockData';
import { ChatWindow } from '../../components/chat/ChatWindow';
import clsx from 'clsx';

export function AgentChatPage() {
  const escalated = mockChatSessions.filter((s) => !s.isAiHandled);
  const [activeId, setActiveId] = useState(escalated[0]?.id || '');

  const session = escalated.find((s) => s.id === activeId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Live Chat</h1>
        <p className="text-slate-500">Escalated conversations from AI</p>
      </div>

      <div className="grid h-[calc(100vh-12rem)] gap-4 lg:grid-cols-4">
        <div className="space-y-2 overflow-y-auto lg:col-span-1">
          {escalated.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={clsx(
                'w-full rounded-lg border p-3 text-left text-sm transition',
                activeId === s.id ? 'border-brand-300 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
            >
              <p className="font-medium text-slate-900">{s.customerName}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {s.messages[s.messages.length - 1]?.content}
              </p>
              {s.ticketId && <span className="mt-1 inline-block text-xs text-brand-600">{s.ticketId}</span>}
            </button>
          ))}
        </div>
        <div className="lg:col-span-3">
          {session ? (
            <ChatWindow
              messages={session.messages}
              onSend={() => {}}
              placeholder="Reply as agent..."
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-400">
              No escalated chats
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
