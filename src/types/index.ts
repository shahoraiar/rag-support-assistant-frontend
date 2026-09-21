export type UserRole = 'customer' | 'agent' | 'admin';
export type UserSource = 'email' | 'google';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory = 'billing' | 'technical' | 'account' | 'general';
export type DocStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type MessageRole = 'user' | 'assistant' | 'agent' | 'system';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  source?: UserSource;
  avatar?: string;
  isAvailable?: boolean;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  customerId: string;
  customerName: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  createdAt: string;
  updatedAt: string;
  slaDueAt: string;
  aiClassification?: {
    category: TicketCategory;
    priority: TicketPriority;
    sentiment: 'positive' | 'neutral' | 'negative';
  };
}

export interface TicketComment {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  seenAt?: string | null;
}

export type TicketActivityType =
  | 'created'
  | 'ai_classified'
  | 'agent_assigned'
  | 'agent_replied'
  | 'customer_replied'
  | 'resolved'
  | 'chat_started'
  | 'chat_escalated';

export interface TicketActivity {
  id: string;
  ticketId: string;
  type: TicketActivityType;
  message: string;
  actorName?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  sources?: { title: string; snippet: string }[];
  createdAt: string;
  seenAt?: string | null;
}

export interface ChatSession {
  id: string;
  customerId: string;
  customerName: string;
  ticketId?: string;
  isAiHandled: boolean;
  escalatedToAgentId?: string;
  messages: ChatMessage[];
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  docType: 'pdf' | 'faq' | 'docx' | 'text';
  status: DocStatus;
  uploadedBy: string;
  pageCount?: number;
  chunkCount?: number;
  fileUrl?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface SLAPolicy {
  id: string;
  priority: TicketPriority;
  firstResponseHours: number;
  resolutionHours: number;
  isActive: boolean;
}

export interface AnalyticsSummary {
  totalTickets: number;
  openTickets: number;
  resolvedToday: number;
  slaCompliance: number;
  aiResolutionRate: number;
  avgResponseMinutes: number;
  ticketsByStatus: Record<TicketStatus, number>;
  ticketsByCategory: Record<TicketCategory, number>;
}

export interface AgentWorkload {
  agentId: string;
  agentName: string;
  openTickets: number;
  maxTickets: number;
  isAvailable: boolean;
}
