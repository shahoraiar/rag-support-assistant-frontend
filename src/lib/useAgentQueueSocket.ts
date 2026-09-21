import { useEffect, useRef } from 'react';
import { mapTicket, type TicketApi } from './api';
import type { Ticket } from '../types';

type QueueSocketEvent =
  | { type: 'queue.ready'; payload: { user_id: number; role: string } }
  | { type: 'ticket.created'; payload: { ticket: TicketApi } }
  | { type: 'ticket.updated'; payload: { ticket: TicketApi } };

function buildQueueWsUrl(token: string): string {
  const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
  if (apiBase) {
    const base = new URL(apiBase);
    const wsProtocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${base.host}/ws/tickets/queue/?token=${encodeURIComponent(token)}`;
  }
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${window.location.host}/ws/tickets/queue/?token=${encodeURIComponent(token)}`;
}

export function useAgentQueueSocket(options: {
  enabled?: boolean;
  onTicketCreated: (ticket: Ticket) => void;
  onTicketUpdated: (ticket: Ticket) => void;
}) {
  const { enabled = true, onTicketCreated, onTicketUpdated } = options;
  const onCreatedRef = useRef(onTicketCreated);
  const onUpdatedRef = useRef(onTicketUpdated);

  useEffect(() => {
    onCreatedRef.current = onTicketCreated;
    onUpdatedRef.current = onTicketUpdated;
  }, [onTicketCreated, onTicketUpdated]);

  useEffect(() => {
    if (!enabled) return;
    const token = localStorage.getItem('supportai_access_token');
    if (!token) return;

    let closed = false;
    let retryTimer: number | undefined;
    let attempt = 0;
    let socket: WebSocket | null = null;

    const connect = () => {
      if (closed) return;
      socket = new WebSocket(buildQueueWsUrl(token));

      socket.onopen = () => {
        attempt = 0;
      };

      socket.onmessage = (event) => {
        let data: QueueSocketEvent;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.type === 'ticket.created') {
          onCreatedRef.current(mapTicket(data.payload.ticket));
        } else if (data.type === 'ticket.updated') {
          onUpdatedRef.current(mapTicket(data.payload.ticket));
        }
      };

      socket.onclose = () => {
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
      socket?.close();
    };
  }, [enabled]);
}
