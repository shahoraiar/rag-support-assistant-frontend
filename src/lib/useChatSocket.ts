import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessageApi } from './api';

type ChatSocketEvent =
  | { type: 'chat.ready'; payload: { session_id: number; user_id: number; role: string } }
  | { type: 'chat.message'; payload: { message: ChatMessageApi } }
  | {
      type: 'chat.typing';
      payload: { user_id: number; role: string; name: string; is_typing: boolean };
    }
  | {
      type: 'chat.seen';
      payload: { message_ids: number[]; seen_at: string; reader_id: number; reader_role: string };
    }
  | { type: 'chat.error'; payload: { detail: string } };

export type PeerTypingState = {
  isTyping: boolean;
  name: string;
  role: string;
} | null;

export type ChatSocketStatus = 'off' | 'connecting' | 'live' | 'error';

function buildWsUrl(sessionId: number, token: string): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
  if (apiBase) {
    const base = new URL(apiBase);
    const wsProtocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${base.host}/ws/chat/${sessionId}/?token=${encodeURIComponent(token)}`;
  }
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/ws/chat/${sessionId}/?token=${encodeURIComponent(token)}`;
}

export function useChatSocket(options: {
  sessionId: number | null;
  enabled: boolean;
  currentUserId?: number | null;
  onMessage: (message: ChatMessageApi) => void;
  onSeen: (messageIds: number[], seenAt: string) => void;
  onError?: (detail: string) => void;
}) {
  const { sessionId, enabled, currentUserId, onMessage, onSeen, onError } = options;
  const [status, setStatus] = useState<ChatSocketStatus>('off');
  const [peerTyping, setPeerTyping] = useState<PeerTypingState>(null);
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
    if (!enabled || !sessionId) {
      socketRef.current?.close();
      socketRef.current = null;
      setStatus('off');
      setPeerTyping(null);
      return;
    }

    const token = localStorage.getItem('supportai_access_token');
    if (!token) {
      setStatus('error');
      onErrorRef.current?.('Missing login token for live chat');
      return;
    }

    let closed = false;
    let retryTimer: number | undefined;
    setStatus('connecting');

    const connect = () => {
      if (closed) return;
      setStatus((prev) => (prev === 'live' ? prev : 'connecting'));
      const socket = new WebSocket(buildWsUrl(sessionId, token));
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
              ? 'Live chat auth failed — please sign in again'
              : 'Not allowed to join this live chat',
          );
          return;
        }
        retryTimer = window.setTimeout(connect, 2000);
      };
      socket.onerror = () => {
        // onclose will follow
      };
      socket.onmessage = (event) => {
        let data: ChatSocketEvent;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        if (data.type === 'chat.ready') {
          setStatus('live');
        } else if (data.type === 'chat.message') {
          onMessageRef.current(data.payload.message);
        } else if (data.type === 'chat.typing') {
          if (currentUserIdRef.current && data.payload.user_id === currentUserIdRef.current) {
            return;
          }
          setPeerTyping(
            data.payload.is_typing
              ? { isTyping: true, name: data.payload.name, role: data.payload.role }
              : null,
          );
        } else if (data.type === 'chat.seen') {
          onSeenRef.current(data.payload.message_ids, data.payload.seen_at);
        } else if (data.type === 'chat.error') {
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
  }, [enabled, sessionId]);

  const sendJson = useCallback((type: string, payload: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type, payload }));
    return true;
  }, []);

  const sendMessage = useCallback(
    (content: string) => sendJson('chat.message', { content }),
    [sendJson],
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => sendJson('chat.typing', { is_typing: isTyping }),
    [sendJson],
  );

  const sendSeen = useCallback(() => sendJson('chat.seen', {}), [sendJson]);

  return {
    connected: status === 'live',
    status,
    peerTyping,
    sendMessage,
    sendTyping,
    sendSeen,
  };
}
