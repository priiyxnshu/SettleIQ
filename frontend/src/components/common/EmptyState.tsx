/**
 * Standard Empty State Component
 *
 * Renders a centered placeholder graphic, title, descriptive message, and optional
 * call-to-action button when data collections or tables contain no records.
 */

import React from 'react';

/**
 * Reusable placeholder view for empty lists, queues, or search result sets.
 */
export const EmptyState: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  iconContainerClassName?: string;
  containerClassName?: string;
}> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  iconContainerClassName,
  containerClassName
}) => (
  <div className={`text-center py-12 px-4 rounded-xl ${containerClassName || ''}`}>
    <div className={`inline-flex p-3 rounded-full mb-3 ${iconContainerClassName || 'bg-slate-100 text-slate-500 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}>
      <Icon className="h-6 w-6" />
    </div>
    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h4>
    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">{description}</p>
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="mt-4 inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-xs cursor-pointer"
      >
        {actionText}
      </button>
    )}
  </div>

);

