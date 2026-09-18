import { useCallback, useEffect, useRef, useState } from 'react';

export type TicketCommentSocketPayload = {
  id: number;
  sender_id: number;
  sender_name: string;
  content: string;
  is_internal: boolean;
  seen_at?: string | null;
  created_at: string;
};

type TicketSocketEvent =
  | { type: 'ticket.ready'; payload: { ticket_uid: string; user_id: number; role: string } }
  | { type: 'ticket.message'; payload: { message: TicketCommentSocketPayload } }
  | {
      type: 'ticket.typing';
      payload: { user_id: number; role: string; name: string; is_typing: boolean };
    }
  | {
      type: 'ticket.seen';
      payload: { message_ids: number[]; seen_at: string; reader_id: number; reader_role: string };
    }
  | { type: 'ticket.error'; payload: { detail: string } };

export type TicketPeerTyping = {
  isTyping: boolean;
  name: string;
  role: string;
} | null;

export type TicketSocketStatus = 'off' | 'connecting' | 'live' | 'error';

function buildWsUrl(ticketUid: string, token: string): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
  if (apiBase) {
    const base = new URL(apiBase);
    const wsProtocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${base.host}/ws/tickets/${encodeURIComponent(ticketUid)}/?token=${encodeURIComponent(token)}`;
  }
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/ws/tickets/${encodeURIComponent(ticketUid)}/?token=${encodeURIComponent(token)}`;
}

export function useTicketSocket(options: {
  ticketUid: string | null;
  enabled?: boolean;
  currentUserId?: number | null;
  onMessage: (message: TicketCommentSocketPayload) => void;
  onSeen: (messageIds: number[], seenAt: string) => void;
  onError?: (detail: string) => void;
}) {
  const { ticketUid, enabled = true, currentUserId, onMessage, onSeen, onError } = options;
  const [status, setStatus] = useState<TicketSocketStatus>('off');
  const [peerTyping, setPeerTyping] = useState<TicketPeerTyping>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const onSeenRef = useRef(onSeen);
  const onErrorRef = useRef(onError);
  const currentUserIdRef = useRef(currentUserId);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onSeenRef.current = onSeen;
    onErrorRef.current = onError;
    currentUserIdRef.current = currentUserId;
  }, [onMessage, onSeen, onError, currentUserId]);

  useEffect(() => {
    if (!enabled || !ticketUid) {
      socketRef.current?.close();
      socketRef.current = null;
      setStatus('off');
      setPeerTyping(null);
      return;
    }

    const token = localStorage.getItem('supportai_access_token');
    if (!token) {
      setStatus('error');
      onErrorRef.current?.('Missing login token for live ticket chat');
      return;
    }

    let closed = false;
    let retryTimer: number | undefined;
    setStatus('connecting');

    const connect = () => {
      if (closed) return;
      const socket = new WebSocket(buildWsUrl(ticketUid, token));
      socketRef.current = socket;

      socket.onopen = () => setStatus('live');
      socket.onclose = (event) => {
        setPeerTyping(null);
        if (closed) {
          setStatus('off');
          return;
        }
        setStatus('error');
        if (event.code === 4401 || event.code === 4403) {
          onErrorRef.current?.(
            event.code === 4401
              ? 'Ticket chat auth failed — please sign in again'
              : 'Not allowed to join this ticket chat',
          );
          return;
        }
        retryTimer = window.setTimeout(connect, 2000);
      };
      socket.onmessage = (event) => {
        let data: TicketSocketEvent;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        if (data.type === 'ticket.ready') {
          setStatus('live');
        } else if (data.type === 'ticket.message') {
          onMessageRef.current(data.payload.message);
        } else if (data.type === 'ticket.typing') {
          if (currentUserIdRef.current && data.payload.user_id === currentUserIdRef.current) {
            return;
          }
          setPeerTyping(
            data.payload.is_typing
              ? { isTyping: true, name: data.payload.name, role: data.payload.role }
              : null,
          );
        } else if (data.type === 'ticket.seen') {
          onSeenRef.current(data.payload.message_ids, data.payload.seen_at);
        } else if (data.type === 'ticket.error') {
          onErrorRef.current?.(data.payload.detail);
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      socketRef.current?.close();
      socketRef.current = null;
      setStatus('off');
      setPeerTyping(null);
    };
  }, [enabled, ticketUid]);

  const sendJson = useCallback((type: string, payload: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type, payload }));
    return true;
  }, []);

  const sendMessage = useCallback(
    (content: string, isInternal = false) =>
      sendJson('ticket.message', { content, is_internal: isInternal }),
    [sendJson],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => sendJson('ticket.typing', { is_typing: isTyping }),
    [sendJson],
  );

  const sendSeen = useCallback(() => sendJson('ticket.seen', {}), [sendJson]);

  return {
    connected: status === 'live',
    status,
    peerTyping,
    sendMessage,
    sendTyping,
    sendSeen,
  };
}
