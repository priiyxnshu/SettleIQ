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
    blue: 'bg-blue-50 text-blue-600 border border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border border-purple-100',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200'
  };

  const badgeThemeStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200'
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
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
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </div>
        <div className="text-sm font-bold text-slate-800">
          {label}
        </div>
        {subtext && (
          <p className="text-xs text-slate-500 font-medium">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
};
