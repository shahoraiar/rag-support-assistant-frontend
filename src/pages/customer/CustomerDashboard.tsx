import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ticket, MessageSquare, Plus, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchChatSessions, fetchTickets } from '../../lib/api';
import { StatCard } from '../../components/ui/Card';
import { TicketList } from '../../components/tickets/TicketCard';
import { Button } from '../../components/ui/Button';
import type { Ticket as TicketType } from '../../types';

export function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [chatCount, setChatCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [ticketData, chatData] = await Promise.all([fetchTickets(), fetchChatSessions()]);
        if (!cancelled) {
          setTickets(ticketData);
          setChatCount(chatData.length);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCount = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
  const recentTickets = tickets.slice(0, 4);

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

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Tickets" value={tickets.length} icon={<Ticket className="h-5 w-5" />} color="blue" />
        <StatCard label="Open" value={openCount} icon={<Clock className="h-5 w-5" />} color="amber" />
        <StatCard label="Resolved" value={resolvedCount} icon={<Ticket className="h-5 w-5" />} color="green" />
        <StatCard label="Chat Sessions" value={chatCount} icon={<MessageSquare className="h-5 w-5" />} color="purple" />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Recent Tickets</h2>
          <Link to="/customer/tickets" className="text-sm text-brand-600 hover:underline">View all</Link>
        </div>
        <TicketList
          tickets={recentTickets}
          onSelect={(t) => navigate(`/customer/tickets?ticket=${encodeURIComponent(t.id)}`)}
        />
      </div>
    </div>
  );
}
