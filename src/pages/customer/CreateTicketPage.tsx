import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, MessageSquarePlus, Send } from 'lucide-react';
import { Textarea, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { createTicket } from '../../lib/api';

/** Manual subject options based on knowledge PDF topics (customer-facing issues). */
const TICKET_SUBJECTS = [
  'Billing Issue',
  'Payment Issue',
  'Refund Request',
  'Service Suspension / Reconnection',
  'Installation / Activation',
  'Network / Outage Issue',
  'Account / Terms Issue',
  'Privacy Issue',
] as const;

const subjectOptions = [
  { value: '', label: 'Select your issue…' },
  ...TICKET_SUBJECTS.map((s) => ({ value: s, label: s })),
];

export function CreateTicketPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ subject: '', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const descriptionLen = form.description.trim().length;
  const canSubmit = form.subject.trim().length > 0 && descriptionLen > 0 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const ticket = await createTicket(form.subject.trim(), form.description.trim());
      navigate(`/customer/tickets?ticket=${encodeURIComponent(ticket.id)}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create ticket.');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-brand-50/40 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <MessageSquarePlus className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Create New Ticket
              </h1>
              <p className="text-sm text-slate-500">
                Choose the issue type, then describe what you need help with.
              </p>
            </div>
          </div>
          <Link to="/customer/tickets" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full gap-1.5 sm:w-auto">
              <ArrowLeft className="h-4 w-4" />
              My Tickets
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Select
            label="Subject"
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            options={subjectOptions}
          />

          <div className="space-y-1.5">
            <Textarea
              label="Description"
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Explain your problem in detail so support can help faster…"
              rows={7}
            />
            <p className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" />
                This becomes the first message in your ticket conversation
              </span>
              <span>{descriptionLen} chars</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3 text-xs text-slate-600">
            After you submit, AI reviews your subject &amp; description against the knowledge base
            and sets <span className="font-medium text-slate-800">priority</span> automatically.
            You&apos;ll land in <span className="font-medium text-slate-800">My Tickets</span> and
            can reply once an agent accepts.
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => navigate('/customer/tickets')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full gap-1.5 shadow-sm shadow-brand-600/20 sm:w-auto"
              loading={loading}
              disabled={!canSubmit}
            >
              {!loading && <Send className="h-4 w-4" />}
              {loading ? 'Classifying & submitting…' : 'Submit Ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
