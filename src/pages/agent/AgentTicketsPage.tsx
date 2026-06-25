import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockTickets, mockComments } from '../../data/mockData';
import { TicketList } from '../../components/tickets/TicketCard';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Textarea } from '../../components/ui/Input';
import type { Ticket } from '../../types';

const aiSuggestions: Record<string, string> = {
  billing: 'I can see the duplicate charge in our system. I am initiating a refund — it should reflect in 3-5 business days.',
  technical: 'We identified the root cause and are deploying a fix. I will update you once the service is restored.',
  account: 'Let me verify your account and reset the authentication settings. Please check your email for a verification link.',
  general: 'Thank you for reaching out. Based on our documentation, here is how you can resolve this...',
};

export function AgentTicketsPage() {
  const { user } = useAuth();
  const assigned = mockTickets.filter((t) => t.assignedAgentId === user?.id);
  const [selected, setSelected] = useState<Ticket | null>(assigned[0] || null);
  const [reply, setReply] = useState('');
  const comments = selected ? mockComments.filter((c) => c.ticketId === selected.id) : [];
  const suggestion = selected ? aiSuggestions[selected.category] : '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assigned Tickets</h1>
        <p className="text-slate-500">{assigned.length} tickets assigned to you</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <TicketList tickets={assigned} onSelect={setSelected} showCustomer />
        </div>
        <div className="lg:col-span-3 space-y-4">
          {selected ? (
            <>
              <Card title={selected.subject} subtitle={`${selected.id} — ${selected.customerName}`}>
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge label={selected.status.replace('_', ' ')} variant="status" value={selected.status} />
                  <Badge label={selected.priority} variant="priority" value={selected.priority} />
                  {selected.aiClassification && (
                    <Badge label={`Sentiment: ${selected.aiClassification.sentiment}`} />
                  )}
                </div>
                <p className="text-sm text-slate-600">{selected.description}</p>
              </Card>

              {/* AI Suggestion */}
              <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-purple-700">
                  <Sparkles className="h-4 w-4" />
                  AI Suggested Reply
                </div>
                <p className="mt-2 text-sm text-purple-900">{suggestion}</p>
                <Button size="sm" variant="secondary" className="mt-3" onClick={() => setReply(suggestion)}>
                  Use Suggestion
                </Button>
              </div>

              {/* Comments */}
              <Card title="Conversation">
                <div className="mb-4 max-h-48 space-y-2 overflow-y-auto">
                  {comments.map((c) => (
                    <div key={c.id} className={`rounded-lg p-3 text-sm ${c.isInternal ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50'}`}>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>{c.senderName} {c.isInternal && '(internal)'}</span>
                        <span>{new Date(c.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 text-slate-700">{c.content}</p>
                    </div>
                  ))}
                </div>
                <Textarea
                  label="Reply to customer"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply..."
                />
                <div className="mt-3 flex gap-2">
                  <Button>Send Reply</Button>
                  <Button variant="secondary">Mark Resolved</Button>
                </div>
              </Card>
            </>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-400">
              No tickets assigned
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
