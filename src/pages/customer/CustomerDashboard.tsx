import { Link } from 'react-router-dom';
import { Ticket, MessageSquare, Plus, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockTickets, mockChatSessions } from '../../data/mockData';
import { StatCard } from '../../components/ui/Card';
import { TicketList } from '../../components/tickets/TicketCard';
import { Button } from '../../components/ui/Button';

export function CustomerDashboard() {
  const { user } = useAuth();
  const myTickets = mockTickets.filter((t) => t.customerId === user?.id);
  const openCount = myTickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
  const resolvedCount = myTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const recentTickets = myTickets.slice(0, 4);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.name}</h1>
          <p className="text-slate-500">Manage your support tickets and chat with AI</p>
        </div>
        <div className="flex gap-2 max-sm:w-full max-sm:flex-col sm:flex-row">
          <Link to="/customer/chat" className="max-sm:w-full">
            <Button variant="secondary" className="w-full"><MessageSquare className="h-4 w-4" /> AI Chat</Button>
          </Link>
          <Link to="/customer/new-ticket" className="max-sm:w-full">
            <Button className="w-full"><Plus className="h-4 w-4" /> New Ticket</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Tickets" value={myTickets.length} icon={<Ticket className="h-5 w-5" />} color="blue" />
        <StatCard label="Open" value={openCount} icon={<Clock className="h-5 w-5" />} color="amber" />
        <StatCard label="Resolved" value={resolvedCount} icon={<Ticket className="h-5 w-5" />} color="green" />
        <StatCard label="Chat Sessions" value={mockChatSessions.filter((c) => c.customerId === user?.id).length} icon={<MessageSquare className="h-5 w-5" />} color="purple" />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Tickets</h2>
          <Link to="/customer/tickets" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>
        <TicketList tickets={recentTickets} />
      </div>
    </div>
  );
}
