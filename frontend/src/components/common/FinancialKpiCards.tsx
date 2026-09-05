/**
 * Financial KPI Cards
 *
 * Displays the expected gross amount, settled processor funds, and net reconciliation
 * difference metrics used across the dashboard and reconciliation summary interfaces.
 */

import React from 'react';
import { CreditCard, Landmark, AlertCircle, CheckCheck, AlertTriangle } from 'lucide-react';

interface FinancialKpiCardsProps {
  expectedAmount: number;
  settledAmount: number;
  differenceAmount: number;
  className?: string;
}

const formatCurrency = (val: number): string => {
  return val.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Reusable 3-card financial header displaying Gross Expected, Settled Funds, and Net Variance.
 */
export const FinancialKpiCards: React.FC<FinancialKpiCardsProps> = ({
  expectedAmount,
  settledAmount,
  differenceAmount,
  className = ''
}) => {
  const isPositive = differenceAmount > 0.005;
  const isZero = Math.abs(differenceAmount) <= 0.005;

  const diffConfig = isZero
    ? {
        label: 'Balanced',
        badgeStyle: 'text-emerald-700 dark:text-emerald-300',
        iconStyle: 'text-emerald-600 dark:text-emerald-400',
        icon: CheckCheck,
        displayValue: '₹0.00'
      }
    : isPositive
    ? {
        label: 'Unsettled',
        badgeStyle: 'text-amber-700 dark:text-amber-400',
        iconStyle: 'text-amber-500 dark:text-amber-400',
        icon: AlertCircle,
        displayValue: `₹${formatCurrency(differenceAmount)}`
      }
    : {
        label: 'Over-Settled',
        badgeStyle: 'text-rose-700 dark:text-rose-400',
        iconStyle: 'text-rose-600 dark:text-rose-400',
        icon: AlertTriangle,
        displayValue: `-₹${formatCurrency(Math.abs(differenceAmount))}`
      };

  const DiffIcon = diffConfig.icon;
  const settledPct = expectedAmount > 0
    ? Math.min(100, Math.max(0, (settledAmount / expectedAmount) * 100))
    : (settledAmount > 0 ? 100 : 0);

  return (
    <section aria-label="Treasury and Settlement Financial Overview" className={`neu-extruded rounded-xl p-3 sm:p-3.5 ${className}`}>
      {/* 3 Financial Metrics Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-3.5">
        {/* Col 1: Expected Amount */}
        <div className="neu-inset-subtle p-3 sm:p-3.5 rounded-xl border border-white/60 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg neu-extruded-sm flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                  <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide truncate">
                  Expected Amount
                </span>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-mono tabular-nums leading-tight">
              ₹{formatCurrency(expectedAmount)}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-300/40 dark:border-slate-800 flex items-center justify-between">
            <span className="neu-inset-pill px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-blue-700 dark:text-blue-300 rounded-md">
              Payments
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Total Dataset
            </span>
          </div>
        </div>

        {/* Col 2: Settled Amount */}
        <div className="neu-inset-subtle p-3 sm:p-3.5 rounded-xl border border-white/60 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg neu-extruded-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide truncate">
                  Settled Amount
                </span>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-mono tabular-nums leading-tight">
              ₹{formatCurrency(settledAmount)}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-300/40 dark:border-slate-800 flex items-center justify-between">
            <span className="neu-inset-pill px-2 py-0.5 text-[10px] sm:text-[11px] font-bold text-emerald-700 dark:text-emerald-300 rounded-md">
              Settled
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              {settledPct.toFixed(1)}% Cleared
            </span>
          </div>
        </div>

        {/* Col 3: Difference */}
        <div className="neu-inset-subtle p-3 sm:p-3.5 rounded-xl border border-white/60 dark:border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg neu-extruded-sm flex items-center justify-center shrink-0 ${diffConfig.iconStyle}`}>
                  <DiffIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide truncate">
                  Difference
                </span>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-mono tabular-nums leading-tight">
              {diffConfig.displayValue}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-300/40 dark:border-slate-800 flex items-center justify-between">
            <span className={`neu-inset-pill px-2 py-0.5 text-[10px] sm:text-[11px] font-bold rounded-md ${diffConfig.badgeStyle}`}>
              {diffConfig.label}
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Variance
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
