import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bot,
  LayoutDashboard,
  Ticket,
  MessageSquare,
  BookOpen,
  BarChart3,
  Users,
  Clock,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const navByRole: Record<UserRole, NavItem[]> = {
  customer: [
    { to: '/customer', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/customer/tickets', label: 'My Tickets', icon: Ticket },
    { to: '/customer/chat', label: 'AI Chat', icon: MessageSquare },
    { to: '/customer/new-ticket', label: 'New Ticket', icon: Bot },
  ],
  agent: [
    { to: '/agent', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/agent/tickets', label: 'Assigned Tickets', icon: Ticket },
    { to: '/agent/chat', label: 'Live Chat', icon: MessageSquare },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/knowledge', label: 'Knowledge Base', icon: BookOpen },
    { to: '/admin/sla', label: 'SLA Policies', icon: Clock },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  ],
};

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const navItems = navByRole[user.role];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-dvh bg-slate-50 lg:flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-64 max-w-[85vw] flex-col bg-slate-900 transition-transform duration-200',
          'lg:static lg:z-auto lg:max-w-none lg:shrink-0 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex items-center gap-3 border-b border-slate-700 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-white">SupportAI</h1>
            <p className="text-xs capitalize text-slate-400">{user.role} portal</p>
          </div>
          <button
            type="button"
            className="ml-auto text-slate-400 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.endsWith('/customer') || item.to.endsWith('/agent') || item.to.endsWith('/admin')}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-700 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.name}</p>
              <p className="truncate text-xs text-slate-400">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
          <button
            type="button"
            className="shrink-0 text-slate-600 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="min-w-0 flex-1" />
          <span className="hidden shrink-0 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 sm:inline">
            Demo Mode — Mock Data
          </span>
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 sm:hidden">
            Demo
          </span>
        </header>
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
