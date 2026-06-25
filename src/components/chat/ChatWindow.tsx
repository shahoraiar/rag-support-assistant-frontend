import clsx from 'clsx';
import { Bot, User, Headphones, Info } from 'lucide-react';
import type { ChatMessage } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
}

const roleConfig = {
  user: { icon: User, bg: 'bg-brand-600 text-white', align: 'justify-end', bubble: 'bg-brand-600 text-white rounded-br-sm' },
  assistant: { icon: Bot, bg: 'bg-purple-100 text-purple-600', align: 'justify-start', bubble: 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm' },
  agent: { icon: Headphones, bg: 'bg-emerald-100 text-emerald-600', align: 'justify-start', bubble: 'bg-emerald-50 border border-emerald-200 text-slate-800 rounded-bl-sm' },
  system: { icon: Info, bg: 'bg-slate-100 text-slate-500', align: 'justify-center', bubble: 'bg-slate-100 text-slate-500 text-xs italic' },
};

export function MessageBubble({ message }: MessageBubbleProps) {
  const config = roleConfig[message.role];
  const Icon = config.icon;

  if (message.role === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">{message.content}</span>
      </div>
    );
  }

  return (
    <div className={clsx('flex gap-2', config.align)}>
      {message.role !== 'user' && (
        <div className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', config.bg)}>
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className={clsx('max-w-[75%] space-y-1', message.role === 'user' && 'order-first')}>
        <div className={clsx('rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm', config.bubble)}>
          {message.content}
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="space-y-1 px-1">
            {message.sources.map((s, i) => (
              <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <span className="font-medium text-brand-600">{s.title}</span>
                <p className="mt-0.5 line-clamp-2">{s.snippet}</p>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400">{new Date(message.createdAt).toLocaleTimeString()}</p>
      </div>
      {message.role === 'user' && (
        <div className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', config.bg)}>
          <Icon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

interface ChatWindowProps {
  messages: ChatMessage[];
  onSend?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatWindow({ messages, onSend, placeholder = 'Type your message...', disabled }: ChatWindowProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('message') as HTMLInputElement;
    if (input.value.trim() && onSend) {
      onSend(input.value.trim());
      input.value = '';
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>
      {onSend && (
        <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4">
          <div className="flex gap-2">
            <input
              name="message"
              disabled={disabled}
              placeholder={placeholder}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={disabled}
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
