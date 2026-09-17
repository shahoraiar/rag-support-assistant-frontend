import type {
  AgentWorkload,
  AnalyticsSummary,
  Ticket,
  TicketActivity,
  TicketActivityType,
  TicketCategory,
  TicketComment,
  TicketPriority,
  TicketStatus,
  User,
  UserRole,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  source?: 'email' | 'google';
  phone?: string;
  avatar?: string | null;
  is_available?: boolean | null;
};

type AuthResponse = {
  user: ApiUser;
  tokens: { access: string; refresh: string };
};

type Paginated<T> = { results: T[] } | T[];

export type TicketApi = {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  source?: string;
  customer_id: number;
  customer_name: string;
  assigned_agent_id: number | null;
  assigned_agent_name: string | null;
  sla_due_at: string;
  first_response_at?: string | null;
  resolved_at?: string | null;
  ai_classification?: {
    category?: TicketCategory;
    priority?: TicketPriority;
    sentiment?: 'positive' | 'neutral' | 'negative';
  } | null;
  created_at: string;
  updated_at: string;
};

type TicketCommentApi = {
  id: number;
  ticket: number;
  sender_id: number;
  sender_name: string;
  content: string;
  is_internal: boolean;
  created_at: string;
};

type TicketActivityApi = {
  id: number;
  ticket: number;
  activity_type: TicketActivityType;
  message: string;
  actor_name: string | null;
  created_at: string;
};

type AnalyticsApi = {
  total_tickets: number;
  open_tickets: number;
  resolved_today: number;
  sla_compliance: number;
  ai_resolution_rate: number;
  avg_response_minutes: number;
  tickets_by_status: Record<TicketStatus, number>;
  tickets_by_category: Record<TicketCategory, number>;
};

type AgentWorkloadApi = {
  agent_id: number;
  agent_name: string;
  open_tickets: number;
  max_tickets: number;
  is_available: boolean;
};

function getAccessToken() {
  return localStorage.getItem('supportai_access_token');
}

function getRefreshToken() {
  return localStorage.getItem('supportai_refresh_token');
}

export function saveTokens(access: string, refresh: string) {
  localStorage.setItem('supportai_access_token', access);
  localStorage.setItem('supportai_refresh_token', refresh);
}

export function clearTokens() {
  localStorage.removeItem('supportai_access_token');
  localStorage.removeItem('supportai_refresh_token');
}

export function hasAccessToken() {
  return Boolean(getAccessToken());
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;

  const response = await fetch(`${API_BASE}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const data = await response.json();
  localStorage.setItem('supportai_access_token', data.access);
  return data.access;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (response.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, options, false);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    let message = error.detail || error.message || `Request failed (${response.status})`;
    if (typeof message !== 'string') {
      if (Array.isArray(message)) message = message.join(', ');
      else if (typeof message === 'object') {
        message = Object.entries(message)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('; ');
      } else {
        message = JSON.stringify(message);
      }
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function unwrapList<T>(data: Paginated<T>): T[] {
  return Array.isArray(data) ? data : data.results;
}

export function mapApiUser(user: ApiUser): User {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    source: user.source,
    avatar: user.avatar || undefined,
    isAvailable: user.is_available ?? undefined,
  };
}

export function mapTicket(ticket: TicketApi): Ticket {
  return {
    id: ticket.id,
    subject: ticket.subject,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category,
    customerId: String(ticket.customer_id),
    customerName: ticket.customer_name,
    assignedAgentId: ticket.assigned_agent_id != null ? String(ticket.assigned_agent_id) : undefined,
    assignedAgentName: ticket.assigned_agent_name || undefined,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    slaDueAt: ticket.sla_due_at,
    aiClassification: ticket.ai_classification
      ? {
          category: ticket.ai_classification.category || ticket.category,
          priority: ticket.ai_classification.priority || ticket.priority,
          sentiment: ticket.ai_classification.sentiment || 'neutral',
        }
      : undefined,
  };
}

function mapComment(comment: TicketCommentApi, ticketId: string): TicketComment {
  return {
    id: String(comment.id),
    ticketId,
    senderId: String(comment.sender_id),
    senderName: comment.sender_name,
    content: comment.content,
    isInternal: comment.is_internal,
    createdAt: comment.created_at,
  };
}

function mapActivity(activity: TicketActivityApi, ticketId: string): TicketActivity {
  return {
    id: String(activity.id),
    ticketId,
    type: activity.activity_type,
    message: activity.message,
    actorName: activity.actor_name || undefined,
    createdAt: activity.created_at,
  };
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, false);
  saveTokens(data.tokens.access, data.tokens.refresh);
  return data;
}

export async function googleLoginApi(credential: string): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/api/auth/google/', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  }, false);
  saveTokens(data.tokens.access, data.tokens.refresh);
  return data;
}

export async function registerApi(payload: {
  name: string;
  email: string;
  password: string;
  role?: 'customer' | 'agent';
}): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/api/auth/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, false);
  if (payload.role !== 'agent') {
    saveTokens(data.tokens.access, data.tokens.refresh);
  }
  return data;
}

export async function fetchCurrentUser(): Promise<User> {
  const data = await apiFetch<ApiUser>('/api/me/auth/me/');
  return mapApiUser(data);
}

export async function fetchTickets(): Promise<Ticket[]> {
  const data = await apiFetch<Paginated<TicketApi>>('/api/me/tickets/');
  return unwrapList(data).map(mapTicket);
}

export async function fetchTicket(ticketId: string): Promise<Ticket> {
  const data = await apiFetch<TicketApi>(`/api/me/tickets/${ticketId}/`);
  return mapTicket(data);
}

export async function createTicket(subject: string, description: string): Promise<Ticket> {
  const data = await apiFetch<TicketApi>('/api/me/tickets/', {
    method: 'POST',
    body: JSON.stringify({ subject, description }),
  });
  return mapTicket(data);
}

export async function fetchTicketComments(ticketId: string): Promise<TicketComment[]> {
  const data = await apiFetch<TicketCommentApi[]>(`/api/me/tickets/${ticketId}/comments/`);
  return data.map((comment) => mapComment(comment, ticketId));
}

export async function postTicketComment(
  ticketId: string,
  content: string,
  isInternal = false,
): Promise<TicketComment> {
  const data = await apiFetch<TicketCommentApi>(`/api/me/tickets/${ticketId}/comments/`, {
    method: 'POST',
    body: JSON.stringify({ content, is_internal: isInternal }),
  });
  return mapComment(data, ticketId);
}

export async function assignTicket(ticketId: string, agentId?: number): Promise<Ticket> {
  const data = await apiFetch<TicketApi>(`/api/me/tickets/${ticketId}/assign/`, {
    method: 'POST',
    body: JSON.stringify(agentId != null ? { agent_id: agentId } : {}),
  });
  return mapTicket(data);
}

export async function resolveTicket(ticketId: string): Promise<Ticket> {
  const data = await apiFetch<TicketApi>(`/api/me/tickets/${ticketId}/resolve/`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return mapTicket(data);
}

export async function fetchTicketActivities(ticketId: string): Promise<TicketActivity[]> {
  const data = await apiFetch<Paginated<TicketActivityApi>>(`/api/me/tickets/${ticketId}/activities/`);
  return unwrapList(data).map((activity) => mapActivity(activity, ticketId));
}

export async function fetchAgents(): Promise<User[]> {
  const data = await apiFetch<Paginated<ApiUser>>('/api/me/agents/');
  return unwrapList(data).map(mapApiUser);
}

export async function fetchAgentWorkload(): Promise<AgentWorkload[]> {
  const data = await apiFetch<AgentWorkloadApi[]>('/api/me/agents/workload/');
  return data.map((item) => ({
    agentId: String(item.agent_id),
    agentName: item.agent_name,
    openTickets: item.open_tickets,
    maxTickets: item.max_tickets,
    isAvailable: item.is_available,
  }));
}

export async function fetchAnalytics(): Promise<AnalyticsSummary> {
  const data = await apiFetch<AnalyticsApi>('/api/me/analytics/dashboard/');
  return {
    totalTickets: data.total_tickets,
    openTickets: data.open_tickets,
    resolvedToday: data.resolved_today,
    slaCompliance: data.sla_compliance,
    aiResolutionRate: data.ai_resolution_rate,
    avgResponseMinutes: data.avg_response_minutes,
    ticketsByStatus: data.tickets_by_status,
    ticketsByCategory: data.tickets_by_category,
  };
}

export type KnowledgeDocumentApi = {
  id: number;
  title: string;
  doc_type: 'pdf' | 'faq' | 'docx' | 'text';
  status: 'pending' | 'processing' | 'ready' | 'failed';
  uploaded_by: string;
  page_count?: number | null;
  chunk_count?: number;
  created_at: string;
};

export type SLAPolicyApi = {
  id: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  first_response_hours: number;
  resolution_hours: number;
  is_active: boolean;
};

export async function fetchKnowledgeDocuments(): Promise<KnowledgeDocumentApi[]> {
  const data = await apiFetch<Paginated<KnowledgeDocumentApi>>('/api/me/knowledge/documents/');
  return unwrapList(data);
}

export async function uploadKnowledgeDocument(file: File, title?: string): Promise<KnowledgeDocumentApi> {
  const form = new FormData();
  form.append('file', file);
  form.append('title', title || file.name.replace(/\.[^.]+$/, ''));
  const ext = file.name.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, string> = { pdf: 'pdf', docx: 'docx', txt: 'text', md: 'text' };
  if (ext && typeMap[ext]) form.append('doc_type', typeMap[ext]);

  return apiFetch<KnowledgeDocumentApi>('/api/me/knowledge/documents/', {
    method: 'POST',
    body: form,
  });
}

export async function deleteKnowledgeDocument(id: number): Promise<void> {
  await apiFetch(`/api/me/knowledge/documents/${id}/`, { method: 'DELETE' });
}

export async function fetchSLAPolicies(): Promise<SLAPolicyApi[]> {
  const data = await apiFetch<Paginated<SLAPolicyApi>>('/api/me/sla/');
  return unwrapList(data);
}

export async function createSLAPolicy(payload: {
  priority: string;
  first_response_hours: number;
  resolution_hours: number;
  is_active?: boolean;
}): Promise<SLAPolicyApi> {
  return apiFetch<SLAPolicyApi>('/api/me/sla/', {
    method: 'POST',
    body: JSON.stringify({ is_active: true, ...payload }),
  });
}

export type ChatMessageApi = {
  id: number;
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  sources?: { title: string; snippet: string }[];
  created_at: string;
};

export type ChatSessionApi = {
  id: number;
  customer_id: number;
  customer_name: string;
  ticket_id: string | null;
  is_ai_handled: boolean;
  escalated_to_agent: number | null;
  escalated_to_agent_name: string | null;
  messages: ChatMessageApi[];
  created_at: string;
};

export type ChatMessageResponse = {
  user_message: ChatMessageApi;
  ai_message?: ChatMessageApi;
  system_message?: ChatMessageApi;
  escalated: boolean;
  ticket_id?: string | null;
  agent_name?: string | null;
};

export async function fetchChatSessions(): Promise<ChatSessionApi[]> {
  const data = await apiFetch<Paginated<ChatSessionApi>>('/api/me/chat/sessions/');
  return unwrapList(data);
}

export async function createChatSession(): Promise<ChatSessionApi> {
  return apiFetch<ChatSessionApi>('/api/me/chat/sessions/', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function sendChatMessage(sessionId: number, content: string): Promise<ChatMessageResponse> {
  return apiFetch<ChatMessageResponse>(`/api/me/chat/sessions/${sessionId}/messages/`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function escalateChatSession(sessionId: number): Promise<{
  escalated: boolean;
  ticket_id: string;
  agent_name?: string | null;
  system_message?: ChatMessageApi;
}> {
  return apiFetch(`/api/me/chat/sessions/${sessionId}/escalate/`, { method: 'POST' });
}
