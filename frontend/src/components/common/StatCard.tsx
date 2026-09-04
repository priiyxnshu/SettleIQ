import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'info' | 'purple' | 'neutral';
  };
  colorTheme?: 'blue' | 'green' | 'amber' | 'purple' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  badge,
  colorTheme = 'blue'
}) => {
  const iconThemeStyles = {
    blue: 'bg-blue-50 text-blue-600 border border-blue-100 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60',
    green: 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60',
    amber: 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60',
    purple: 'bg-purple-50 text-purple-600 border border-purple-100 dark:bg-purple-950/60 dark:text-purple-400 dark:border-purple-800/60',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
  };

  const badgeThemeStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
    info: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      {/* Top Row: Icon Container & Top-Right Badge */}
      <div className="flex items-start justify-between">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner ${iconThemeStyles[colorTheme]}`}>
          <Icon className="h-6 w-6" />
        </div>
        {badge && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${badgeThemeStyles[badge.variant || 'neutral']}`}>
            {badge.text}
          </span>
        )}
      </div>

      {/* Center & Bottom: Large Metric Value & Labels */}
      <div className="mt-5 space-y-1">
        <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {value}
        </div>
        <div className="text-sm font-bold text-slate-800 dark:text-slate-300">
          {label}
        </div>
        {subtext && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};
