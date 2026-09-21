import clsx from 'clsx';
import { Bot, ChevronDown, Headphones, Info, SendHorizontal, User } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ChatMessage, MessageRole, UserRole } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  systemAction?: ReactNode;
}

const roleConfig = {
  user: {
    icon: User,
    avatar: 'bg-brand-600 text-white',
    bubble: 'bg-brand-600 text-white rounded-br-md',
  },
  assistant: {
    icon: Bot,
    avatar: 'bg-slate-800 text-white',
    bubble: 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm',
  },
  agent: {
    icon: Headphones,
    avatar: 'bg-emerald-600 text-white',
    bubble: 'bg-emerald-50 border border-emerald-100 text-slate-800 rounded-bl-md',
  },
  system: {
    icon: Info,
    avatar: 'bg-slate-100 text-slate-500',
    bubble: 'bg-slate-100 text-slate-500 text-xs italic',
  },
};

function displayContent(content: string, hasSources: boolean): string {
  if (!hasSources) return content;
  // Hide inline "Reference: …" lines — shown in the collapsible panel instead
  return content
    .replace(/\n*Reference:\s*.+$/gim, '')
    .trim();
}

export function MessageBubble({ message, isOwn, systemAction }: MessageBubbleProps) {
  const config = roleConfig[message.role];
  const Icon = config.icon;
  const hasSources = Boolean(message.sources && message.sources.length > 0);
  const [refsOpen, setRefsOpen] = useState(false);

  if (message.role === 'system') {
    return (
      <div className="flex flex-col items-center gap-2 py-1.5">
        <span className="max-w-[90%] rounded-full bg-slate-100/90 px-3 py-1 text-center text-[11px] text-slate-500">
          {message.content}
        </span>
        {systemAction}
      </div>
    );
  }

  return (
    <div className={clsx('flex gap-2.5', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && (
        <div
          className={clsx(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            config.avatar,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className={clsx('max-w-[82%] space-y-1 sm:max-w-[70%]', isOwn && 'items-end')}>
        <div
          className={clsx(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
            isOwn ? 'bg-brand-600 text-white rounded-br-md shadow-sm' : config.bubble,
          )}
        >
          {displayContent(message.content, hasSources)}
        </div>
        {hasSources && (
          <div className="px-0.5">
            <button
              type="button"
              onClick={() => setRefsOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400 transition hover:bg-slate-100 hover:text-brand-700"
              aria-expanded={refsOpen}
            >
              Reference
              <ChevronDown
                className={clsx('h-3 w-3 transition-transform', refsOpen && 'rotate-180')}
              />
            </button>
            {refsOpen && (
              <div className="mt-1.5 space-y-1.5">
                {message.sources!.map((s, i) => (
                  <div
                    key={`${s.title}-${i}`}
                    className="rounded-lg border border-slate-200/80 bg-white/90 px-3 py-2 text-xs text-slate-500 shadow-sm"
                  >
                    <span className="font-semibold text-brand-700">{s.title}</span>
                    {s.snippet ? (
                      <p className="mt-0.5 line-clamp-2 text-slate-500">{s.snippet}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <div
          className={clsx(
            'flex items-center gap-2 px-1 text-[11px] text-slate-400',
            isOwn && 'justify-end',
          )}
        >
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isOwn && message.seenAt && (
            <span className="font-medium text-brand-600">Seen</span>
          )}
        </div>
      </div>
      {isOwn && (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
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
  title?: string;
  subtitle?: string;
  headerBadge?: ReactNode;
  headerActions?: ReactNode;
  emptyTitle?: string;
  emptyHint?: string;
  sendingHint?: string | null;
  /** Shown under the latest system message (e.g. open My Tickets after escalate). */
  systemMessageAction?: ReactNode;
  /** Clickable starter questions (shown until the user sends a message). */
  suggestions?: string[];
}

export function ChatWindow({
  messages,
  onSend,
  placeholder = 'Type your message...',
  disabled,
  viewerRole,
  peerTypingLabel,
  onTypingChange,
  title,
  subtitle,
  headerBadge,
  headerActions,
  emptyTitle = 'Start the conversation',
  emptyHint = 'Send a message below to begin.',
  sendingHint,
  systemMessageAction,
  suggestions = [],
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingIdleRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ownRole = ownRoleForViewer(viewerRole);
  const lastSystemId = [...messages].reverse().find((m) => m.role === 'system')?.id;
  const hasUserMessage = messages.some((m) => m.role === 'user' || m.role === 'agent');
  const showSuggestions = Boolean(onSend && suggestions.length > 0 && !hasUserMessage && !disabled);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, peerTypingLabel, sendingHint]);

  const submitText = () => {
    const input = inputRef.current;
    if (!input || !onSend) return;
    const text = input.value.trim();
    if (!text || disabled) return;
    onTypingChange?.(false);
    onSend(text);
    input.value = '';
    input.style.height = 'auto';
  };

  const sendSuggestion = (text: string) => {
    if (!onSend || disabled) return;
    onTypingChange?.(false);
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitText();
    }
  };

  const handleInput = () => {
    const input = inputRef.current;
    if (input) {
      input.style.height = 'auto';
      input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    }
    if (!onTypingChange) return;
    onTypingChange(true);
    if (typingIdleRef.current) window.clearTimeout(typingIdleRef.current);
    typingIdleRef.current = window.setTimeout(() => onTypingChange(false), 1200);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {(title || headerActions) && (
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {title && (
                <h2 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                  {title}
                </h2>
              )}
              {headerBadge}
            </div>
            {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
          {headerActions && <div className="flex shrink-0 items-center gap-2">{headerActions}</div>}
        </div>
      )}

      <div className="relative min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-50 via-white to-slate-50">
        <div className="space-y-3.5 px-4 py-4 sm:px-5">
          {messages.length === 0 ? (
            <div className="flex min-h-[40dvh] flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                {viewerRole === 'agent' ? (
                  <Headphones className="h-6 w-6" />
                ) : (
                  <Bot className="h-6 w-6" />
                )}
              </div>
              <p className="mt-3 text-sm font-medium text-slate-600">{emptyTitle}</p>
              <p className="mt-1 max-w-xs text-xs text-slate-400">{emptyHint}</p>
            </div>
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isOwn={Boolean(ownRole && m.role === ownRole)}
                systemAction={
                  m.role === 'system' && m.id === lastSystemId ? systemMessageAction : undefined
                }
              />
            ))
          )}

          {showSuggestions && (
            <div className="pt-1">
              <p className="mb-2 px-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Suggested questions
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendSuggestion(q)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-slate-700 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(peerTypingLabel || sendingHint) && (
            <div className="flex items-center gap-2 px-1 text-xs text-slate-400">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300" />
              </span>
              <span className="italic">{peerTypingLabel || sendingHint}</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {onSend && (
        <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-3 sm:px-4">
          <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-2 focus-within:border-brand-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100">
            <textarea
              ref={inputRef}
              name="message"
              rows={1}
              disabled={disabled}
              placeholder={placeholder}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              onBlur={() => onTypingChange?.(false)}
              className="max-h-[120px] min-h-[42px] min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-slate-400 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={submitText}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-50"
              aria-label="Send message"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[10px] text-slate-400">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}
