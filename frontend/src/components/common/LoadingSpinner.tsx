import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading data...',
  className = 'py-12'
}) => (
  <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
    <Loader2 className="h-7 w-7 text-indigo-500 animate-spin" />
    <span className="text-xs font-medium text-slate-400">{message}</span>
  </div>
);

export const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ icon: Icon, title, description, actionText, onAction }) => (
  <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
    <div className="inline-flex p-3 rounded-full bg-slate-900 text-slate-400 border border-slate-800 mb-3">
      <Icon className="h-6 w-6" />
    </div>
    <h4 className="text-sm font-semibold text-white">{title}</h4>
    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">{description}</p>
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="mt-4 inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
      >
        {actionText}
      </button>
    )}
  </div>
);
