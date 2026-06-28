import clsx from 'clsx';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export function Card({ children, className, title, subtitle, action }: CardProps) {
  return (
    <div className={clsx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(title || action) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            {title && <h3 className="font-semibold text-slate-900">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}

const iconColors = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  red: 'bg-red-100 text-red-600',
  purple: 'bg-purple-100 text-purple-600',
};

export function StatCard({ label, value, icon, trend, color = 'blue' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          {trend && <p className="mt-1 text-xs text-slate-400">{trend}</p>}
        </div>
        <div className={clsx('rounded-lg p-3', iconColors[color])}>{icon}</div>
      </div>
    </div>
  );
}
