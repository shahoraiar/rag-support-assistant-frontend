import { mockSLAPolicies } from '../../data/mockData';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export function SLAPoliciesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">SLA Policies</h1>
          <p className="text-sm text-slate-500 sm:text-base">Response and resolution deadlines by priority</p>
        </div>
        <Button variant="secondary" className="w-full sm:w-auto">Add Policy</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {mockSLAPolicies.map((sla) => (
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
      </div>
    </div>
  );
}
