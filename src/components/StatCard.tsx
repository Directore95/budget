import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'default' | 'green' | 'red' | 'indigo' | 'amber';
  trend?: { value: string; positive: boolean };
}

const colorMap = {
  default: 'bg-white',
  green: 'bg-green-50',
  red: 'bg-red-50',
  indigo: 'bg-indigo-50',
  amber: 'bg-amber-50',
};

const titleColorMap = {
  default: 'text-gray-500',
  green: 'text-green-700',
  red: 'text-red-700',
  indigo: 'text-indigo-700',
  amber: 'text-amber-700',
};

const valueColorMap = {
  default: 'text-gray-900',
  green: 'text-green-900',
  red: 'text-red-900',
  indigo: 'text-indigo-900',
  amber: 'text-amber-900',
};

export function StatCard({ title, value, subtitle, icon, color = 'default', trend }: StatCardProps) {
  return (
    <div className={`${colorMap[color]} rounded-xl border border-gray-200 p-5`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium uppercase tracking-wide ${titleColorMap[color]}`}>{title}</p>
          <p className={`text-2xl font-bold mt-1 ${valueColorMap[color]} truncate`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-1 font-medium ${trend.positive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.positive ? '▲' : '▼'} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className="ml-3 flex-shrink-0 opacity-60">{icon}</div>
        )}
      </div>
    </div>
  );
}
