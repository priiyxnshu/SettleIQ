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
        subtext: 'Payments match settled funds',
        badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        iconStyle: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        subtextStyle: 'text-emerald-600',
        icon: CheckCheck,
        displayValue: `₹0.00`
      }
    : isPositive
    ? {
        label: 'Unsettled',
        subtext: 'Unresolved / pending settlement',
        badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200',
        iconStyle: 'bg-amber-50 text-amber-600 border-amber-100',
        subtextStyle: 'text-amber-600',
        icon: AlertCircle,
        displayValue: `₹${formatCurrency(differenceAmount)}`
      }
    : {
        label: 'Over-Settled',
        subtext: 'Settled exceeds expected amount',
        badgeStyle: 'bg-rose-50 text-rose-700 border-rose-200',
        iconStyle: 'bg-rose-50 text-rose-600 border-rose-100',
        subtextStyle: 'text-rose-600',
        icon: AlertTriangle,
        displayValue: `-₹${formatCurrency(Math.abs(differenceAmount))}`
      };

  const DiffIcon = diffConfig.icon;

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 ${className}`}>
      {/* 1. Expected Amount */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100">
            <CreditCard className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            Payments
          </span>
        </div>
        <div className="mt-4 space-y-0.5">
          <div className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
            ₹{formatCurrency(expectedAmount)}
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Expected Amount
          </div>
          <p className="text-[11px] text-slate-400 font-medium pt-0.5">
            Total payments dataset
          </p>
        </div>
      </div>

      {/* 2. Settled Amount */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Landmark className="h-5 w-5" />
          </div>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Settled
          </span>
        </div>
        <div className="mt-4 space-y-0.5">
          <div className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
            ₹{formatCurrency(settledAmount)}
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Settled Amount
          </div>
          <p className="text-[11px] text-slate-400 font-medium pt-0.5">
            Total settled records
          </p>
        </div>
      </div>

      {/* 3. Difference */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center border ${diffConfig.iconStyle}`}>
            <DiffIcon className="h-5 w-5" />
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${diffConfig.badgeStyle}`}>
            {diffConfig.label}
          </span>
        </div>
        <div className="mt-4 space-y-0.5">
          <div className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight">
            {diffConfig.displayValue}
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Difference
          </div>
          <p className={`text-[11px] font-medium pt-0.5 ${diffConfig.subtextStyle}`}>
            {diffConfig.subtext}
          </p>
        </div>
      </div>
    </div>
  );
};
