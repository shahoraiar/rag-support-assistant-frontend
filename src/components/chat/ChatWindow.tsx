import clsx from 'clsx';
import { Bot, User, Headphones, Info } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ChatMessage, MessageRole, UserRole } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

const roleConfig = {
  user: { icon: User, bg: 'bg-brand-600 text-white', align: 'justify-end', bubble: 'bg-brand-600 text-white rounded-br-sm' },
  assistant: { icon: Bot, bg: 'bg-purple-100 text-purple-600', align: 'justify-start', bubble: 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm' },
  agent: { icon: Headphones, bg: 'bg-emerald-100 text-emerald-600', align: 'justify-start', bubble: 'bg-emerald-50 border border-emerald-200 text-slate-800 rounded-bl-sm' },
  system: { icon: Info, bg: 'bg-slate-100 text-slate-500', align: 'justify-center', bubble: 'bg-slate-100 text-slate-500 text-xs italic' },
};

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const config = roleConfig[message.role];
  const Icon = config.icon;
  const align = isOwn ? 'justify-end' : config.align;
  const bubble = isOwn
    ? 'bg-brand-600 text-white rounded-br-sm'
    : config.bubble;

  if (message.role === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">{message.content}</span>
      </div>
    );
  }

  return (
    <div className={clsx('flex gap-2', align)}>
      {!isOwn && (
        <div className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', config.bg)}>
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className={clsx('max-w-[85%] space-y-1 sm:max-w-[75%]', isOwn && 'order-first')}>
        <div className={clsx('rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm', bubble)}>
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
        <div className={clsx('flex items-center gap-2 px-1 text-xs text-slate-400', isOwn && 'justify-end')}>
          <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
          {isOwn && message.seenAt && <span className="font-medium text-brand-600">Seen</span>}
        </div>
      </div>
      {isOwn && (
        <div className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', 'bg-brand-600 text-white')}>
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function ownRoleForViewer(viewerRole?: UserRole): MessageRole | null {
  if (viewerRole === 'customer') return 'user';
  if (viewerRole === 'agent' || viewerRole === 'admin') return 'agent';
  return null;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  onSend?: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  viewerRole?: UserRole;
  peerTypingLabel?: string | null;
  onTypingChange?: (isTyping: boolean) => void;
}

export function ChatWindow({
  messages,
  onSend,
  placeholder = 'Type your message...',
  disabled,
  viewerRole,
  peerTypingLabel,
  onTypingChange,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingIdleRef = useRef<number | null>(null);
  const ownRole = ownRoleForViewer(viewerRole);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, peerTypingLabel]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('message') as HTMLInputElement;
    if (input.value.trim() && onSend) {
      onTypingChange?.(false);
      onSend(input.value.trim());
      input.value = '';
    }
  };

  const handleInput = () => {
    if (!onTypingChange) return;
    onTypingChange(true);
    if (typingIdleRef.current) window.clearTimeout(typingIdleRef.current);
    typingIdleRef.current = window.setTimeout(() => onTypingChange(false), 1200);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isOwn={Boolean(ownRole && m.role === ownRole)} />
        ))}
        {peerTypingLabel && (
          <p className="px-2 text-xs text-slate-400 italic">{peerTypingLabel}</p>
        )}
        <div ref={bottomRef} />
      </div>
      {onSend && (
        <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              name="message"
              disabled={disabled}
              placeholder={placeholder}
              onChange={handleInput}
              onBlur={() => onTypingChange?.(false)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={disabled}
              className="shrink-0 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 sm:self-stretch"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
