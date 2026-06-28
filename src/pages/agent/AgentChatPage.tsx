import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { mockChatSessions } from '../../data/mockData';
import { ChatWindow } from '../../components/chat/ChatWindow';
import { Button } from '../../components/ui/Button';
import clsx from 'clsx';

export function AgentChatPage() {
  const escalated = mockChatSessions.filter((s) => !s.isAiHandled);
  const [activeId, setActiveId] = useState(escalated[0]?.id || '');
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const session = escalated.find((s) => s.id === activeId);

  const handleSelect = (id: string) => {
    setActiveId(id);
    setMobileShowChat(true);
  };

  return (
    <div className="flex min-h-0 flex-col space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Live Chat</h1>
        <p className="text-sm text-slate-500 sm:text-base">Escalated conversations from AI</p>
      </div>

      <div className="flex min-h-[60dvh] flex-col gap-4 lg:grid lg:min-h-[calc(100dvh-12rem)] lg:grid-cols-4">
        <div className={`space-y-2 overflow-y-auto lg:col-span-1 ${mobileShowChat ? 'hidden lg:block' : ''}`}>
          {escalated.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => handleSelect(s.id)}
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

        <div className={`flex min-h-[50dvh] flex-col lg:col-span-3 ${!mobileShowChat ? 'hidden lg:flex' : 'flex'}`}>
          {session ? (
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
                messages={session.messages}
                onSend={() => {}}
                placeholder="Reply as agent..."
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
