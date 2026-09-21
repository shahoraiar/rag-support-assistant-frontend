import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  FileCheck2,
  Headphones,
  MessageSquare,
  Ticket,
  TriangleAlert,
} from 'lucide-react';
import clsx from 'clsx';
import {
  fetchNotifications,
  markNotificationsRead,
  type NotificationApi,
} from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function typeMeta(type: string) {
  switch (type) {
    case 'ticket_assigned':
      return { icon: Ticket, tone: 'bg-violet-50 text-violet-600' };
    case 'new_ticket':
      return { icon: Ticket, tone: 'bg-brand-50 text-brand-600' };
    case 'new_message':
      return { icon: MessageSquare, tone: 'bg-sky-50 text-sky-600' };
    case 'chat_escalated':
      return { icon: Headphones, tone: 'bg-amber-50 text-amber-600' };
    case 'sla_breach':
      return { icon: TriangleAlert, tone: 'bg-rose-50 text-rose-600' };
    case 'document_ready':
      return { icon: FileCheck2, tone: 'bg-emerald-50 text-emerald-600' };
    default:
      return { icon: Bell, tone: 'bg-slate-100 text-slate-600' };
  }
}

function badgeLabel(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

function buildNotificationWsUrl(token: string): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
  if (apiBase) {
    const base = new URL(apiBase);
    const wsProtocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${base.host}/ws/notifications/?token=${encodeURIComponent(token)}`;
  }
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/ws/notifications/?token=${encodeURIComponent(token)}`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationApi[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bump, setBump] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevUnread = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchNotifications();
      setItems(data.results);
      setUnread(data.unread_count);
    } catch {
      // keep previous
    }
  }, [user]);

  useEffect(() => {
    if (unread > prevUnread.current) {
      setBump(true);
      const t = window.setTimeout(() => setBump(false), 700);
      prevUnread.current = unread;
      return () => window.clearTimeout(t);
    }
    prevUnread.current = unread;
  }, [unread]);

  // Initial load + refresh only when tab becomes visible again (no interval polling)
  useEffect(() => {
    load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  // Live push: only fetch/update when a new notification arrives
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('supportai_access_token');
    if (!token) return;

    let closed = false;
    let retryTimer: number | undefined;
    let attempt = 0;

    const connect = () => {
      if (closed) return;
      const ws = new WebSocket(buildNotificationWsUrl(token));
      socketRef.current = ws;

      ws.onopen = () => {
        attempt = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type: string;
            payload?: {
              notification?: NotificationApi;
              unread_count?: number;
            };
          };
          if (data.type === 'notification.ready' && typeof data.payload?.unread_count === 'number') {
            setUnread(data.payload.unread_count);
            return;
          }
          if (data.type === 'notification.created' && data.payload?.notification) {
            const n = data.payload.notification;
            setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
            if (typeof data.payload.unread_count === 'number') {
              setUnread(data.payload.unread_count);
            } else {
              setUnread((c) => c + (n.is_read ? 0 : 1));
            }
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        socketRef.current = null;
        if (closed) return;
        attempt += 1;
        const delay = Math.min(1000 * 2 ** attempt, 30000);
        retryTimer = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      await load();
      setLoading(false);
    }
  };

  const handleMarkAll = async () => {
    try {
      const data = await markNotificationsRead({ mark_all: true });
      setUnread(data.unread_count);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const handleClickItem = async (n: NotificationApi) => {
    if (!n.is_read) {
      try {
        const data = await markNotificationsRead({ ids: [n.id] });
        setUnread(data.unread_count);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      } catch {
        // ignore
      }
    }
    setOpen(false);
    const ticketUid = n.metadata?.ticket_uid;
    if (typeof ticketUid === 'string' && ticketUid) {
      const q = `?ticket=${encodeURIComponent(ticketUid)}`;
      if (user?.role === 'customer') navigate(`/customer/tickets${q}`);
      else if (user?.role === 'agent') navigate(`/agent/tickets${q}`);
      else navigate('/admin');
      return;
    }
    if (n.notification_type === 'chat_escalated') {
      if (user?.role === 'customer') navigate('/customer/tickets');
      else if (user?.role === 'agent') navigate('/agent/tickets');
    }
  };

  const hasUnread = unread > 0;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={handleOpen}
        className={clsx(
          'relative flex h-10 w-10 items-center justify-center rounded-full transition',
          open
            ? 'bg-brand-50 text-brand-700 ring-2 ring-brand-100'
            : hasUnread
              ? 'bg-slate-50 text-slate-800 hover:bg-brand-50 hover:text-brand-700'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
        )}
        aria-label={hasUnread ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell
          className={clsx('h-[1.15rem] w-[1.15rem]', hasUnread && 'fill-brand-600/15 text-brand-700')}
          strokeWidth={hasUnread ? 2.25 : 1.75}
        />

        {hasUnread && (
          <>
            <span
              className={clsx(
                'pointer-events-none absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500',
                bump && 'animate-ping opacity-75',
              )}
              aria-hidden
            />
            <span
              key={unread}
              className={clsx(
                'absolute -right-0.5 -top-0.5 flex h-[1.15rem] min-w-[1.15rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-white transition-transform',
                bump && 'scale-110',
              )}
            >
              {badgeLabel(unread)}
            </span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,23rem)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/60">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="text-[11px] text-slate-500">
                {hasUnread ? `${unread} unread` : 'You are all caught up'}
              </p>
            </div>
            {hasUnread && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 transition hover:bg-brand-50 hover:text-brand-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-slate-400">
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />
                <p className="text-sm">Loading…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                  <Bell className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-slate-600">No notifications yet</p>
                <p className="text-xs text-slate-400">Updates will show up here live</p>
              </div>
            ) : (
              items.map((n) => {
                const meta = typeMeta(n.notification_type);
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClickItem(n)}
                    className={clsx(
                      'flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50',
                      !n.is_read && 'bg-brand-50/40',
                    )}
                  >
                    <span
                      className={clsx(
                        'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                        meta.tone,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span
                          className={clsx(
                            'truncate text-sm text-slate-900',
                            !n.is_read && 'font-semibold',
                          )}
                        >
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                        )}
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">
                        {n.message}
                      </span>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {timeAgo(n.created_at)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
