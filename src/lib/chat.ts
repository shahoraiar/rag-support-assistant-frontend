import type { ChatMessageApi } from '../lib/api';
import type { ChatMessage } from '../types';

export function mapChatMessage(message: ChatMessageApi): ChatMessage {
  return {
    id: String(message.id),
    role: message.role,
    content: message.content,
    sources: message.sources,
    createdAt: message.created_at,
  };
}
