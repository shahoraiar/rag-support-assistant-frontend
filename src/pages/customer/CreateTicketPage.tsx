import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { CheckCircle, Clock, Sparkles, UserPlus, Bell, Info } from 'lucide-react';

const nextSteps = [
  { icon: CheckCircle, title: 'Ticket submitted', desc: 'You get a ticket ID (e.g. T-1007)', color: 'text-emerald-600' },
  { icon: Sparkles, title: 'AI classifies (5 sec)', desc: 'Category and priority set automatically from your description', color: 'text-purple-600' },
  { icon: Clock, title: 'Waiting for agent', desc: 'Ticket goes to queue — status shows "Open"', color: 'text-amber-600' },
  { icon: UserPlus, title: 'Agent picks up', desc: 'Status changes to "In Progress" — you see agent name', color: 'text-emerald-600' },
  { icon: Bell, title: 'Agent replies', desc: 'Reply appears in ticket + notification (WebSocket later)', color: 'text-brand-600' },
];

export function CreateTicketPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [newTicketId] = useState(`T-${1007 + Math.floor(Math.random() * 100)}`);
  const [form, setForm] = useState({ subject: '', description: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-8">
        <div className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
          <h2 className="mt-4 text-2xl font-bold">Ticket Created!</h2>
          <p className="mt-1 font-mono text-lg text-brand-600">{newTicketId}</p>
          <p className="mt-2 text-slate-500">Save this ID to track your request</p>
        </div>

        <Card title="What happens next?">
          <div className="space-y-4">
            {nextSteps.map((step, i) => (
              <div key={step.title} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <step.icon className={`h-5 w-5 ${step.color}`} />
                  {i < nextSteps.length - 1 && <div className="mt-1 h-full w-0.5 bg-slate-200" />}
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium text-slate-900">{step.title}</p>
                  <p className="text-sm text-slate-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>You are now waiting.</strong> Go to <strong>My Tickets</strong> to see status updates.
          When an agent joins, you will see their name and a green banner on your ticket.
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => navigate('/customer/tickets')}>
            View My Tickets
          </Button>
          <Button variant="secondary" className="flex-1" onClick={() => navigate('/customer')}>
            Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Create New Ticket</h1>
        <p className="text-slate-500">Describe your issue — just subject and details. AI handles the rest.</p>
      </div>

      <div className="flex gap-3 rounded-xl border border-purple-100 bg-purple-50 p-4 text-sm text-purple-800">
        <Info className="h-5 w-5 shrink-0 text-purple-600" />
        <div>
          <p className="font-medium">You do not choose priority or category</p>
          <p className="mt-1 text-purple-700">
            Our AI reads your description and sets category (billing, technical, etc.) and priority automatically.
            This keeps the queue fair for everyone.
          </p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Subject"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Brief summary of your issue"
          />
          <Textarea
            label="Description"
            required
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Explain your problem in detail — the more context, the better AI can classify and route your ticket..."
            rows={6}
          />
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => navigate('/customer')}>Cancel</Button>
            <Button type="submit" className="w-full sm:w-auto">Submit Ticket</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
