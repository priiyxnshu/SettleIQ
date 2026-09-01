import React from 'react';

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
