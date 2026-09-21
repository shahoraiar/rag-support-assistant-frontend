import { useEffect, useState } from 'react';
import { createSLAPolicy, fetchSLAPolicies, type SLAPolicyApi } from '../../lib/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import type { SLAPolicy, TicketPriority } from '../../types';

function mapPolicy(policy: SLAPolicyApi): SLAPolicy {
  return {
    id: String(policy.id),
    priority: policy.priority,
    firstResponseHours: policy.first_response_hours,
    resolutionHours: policy.resolution_hours,
    isActive: policy.is_active,
  };
}

const priorityOrder: TicketPriority[] = ['urgent', 'high', 'medium', 'low'];

export function SLAPoliciesPage() {
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    priority: 'medium' as TicketPriority,
    firstResponseHours: 8,
    resolutionHours: 48,
  });

  const loadPolicies = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSLAPolicies();
      const mapped = data.map(mapPolicy);
      mapped.sort(
        (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority),
      );
      setPolicies(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load SLA policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleCreate = async () => {
    setError('');
    try {
      await createSLAPolicy({
        priority: form.priority,
        first_response_hours: form.firstResponseHours,
        resolution_hours: form.resolutionHours,
      });
      setShowForm(false);
      await loadPolicies();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create policy');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">SLA Policies</h1>
          <p className="text-sm text-slate-500 sm:text-base">
            Service Level Agreement — how fast agents must reply by priority
          </p>
        </div>
        <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setShowForm((v) => !v)}>
          Add Policy
        </Button>
      </div>

      <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <p className="font-medium">What is SLA?</p>
        <p className="mt-1 text-sky-900/90">
          SLA (Service Level Agreement) sets the clock for each ticket priority: how many hours until
          the first agent reply, and how many hours until the ticket should be resolved. When AI (or
          the system) assigns a priority like urgent/high/medium/low, the matching active policy here
          calculates the ticket deadline (<code className="text-xs">sla_due_at</code>).
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {showForm && (
        <Card>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Priority</span>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })}
              >
                {priorityOrder.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">First response (hours)</span>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.firstResponseHours}
                onChange={(e) => setForm({ ...form, firstResponseHours: Number(e.target.value) })}
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Resolution (hours)</span>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.resolutionHours}
                onChange={(e) => setForm({ ...form, resolutionHours: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={handleCreate}>Save Policy</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading policies...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {policies.map((sla) => (
            <Card key={sla.id}>
              <div className="flex items-center justify-between">
                <Badge label={sla.priority} variant="priority" value={sla.priority} />
                <span className={`text-xs font-medium ${sla.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {sla.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{sla.firstResponseHours}h</p>
                  <p className="text-xs text-slate-500">First Response</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-2xl font-bold text-slate-900">{sla.resolutionHours}h</p>
                  <p className="text-xs text-slate-500">Resolution</p>
                </div>
              </div>
            </Card>
          ))}
          {!policies.length && (
            <p className="col-span-full text-sm text-slate-400">
              No SLA policies yet. Seed demo data or add a policy.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
