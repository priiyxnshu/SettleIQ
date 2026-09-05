/**
 * Standard Operational Metric StatCard Component
 *
 * Renders an extruded metric card featuring an icon container, optional top-right pill badge,
 * prominent tabular numeric value, and descriptive uppercase category label.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'info' | 'purple' | 'neutral';
  };
  colorTheme?: 'blue' | 'green' | 'amber' | 'purple' | 'neutral';
}

/**
 * Reusable KPI card with thematic coloring, embossed container, and tabular digits.
 */
export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  badge,
  colorTheme = 'blue'
}) => {
  const iconThemeStyles = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-500 dark:text-amber-400',
    purple: 'text-purple-600 dark:text-purple-400',
    neutral: 'text-slate-600 dark:text-slate-400'
  };

  const badgeThemeStyles = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    purple: 'text-purple-600 dark:text-purple-400',
    neutral: 'text-slate-600 dark:text-slate-400'
  };

  return (
    <div className="neu-extruded rounded-xl py-2.5 px-3.5 sm:py-3 sm:px-4 relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between">
      {/* Top Row: Icon Container & Top-Right Pill Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg neu-extruded-sm flex items-center justify-center shrink-0 ${iconThemeStyles[colorTheme]}`}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        {badge && (
          <span className={`neu-inset-pill px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold rounded-full ${badgeThemeStyles[colorTheme]}`}>
            {badge.text}
          </span>
        )}
      </div>

      {/* Center: Metric Value & Label */}
      <div>
        <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 font-mono tabular-nums leading-tight">
          {value}
        </div>
        <h2 className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mt-0.5 truncate">
          {label}
        </h2>
      </div>
    </div>
  );
};
