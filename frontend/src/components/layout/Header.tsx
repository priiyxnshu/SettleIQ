import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  actions
}) => {
  return (
    <header className={`${subtitle ? 'h-20' : 'h-16'} bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-20 transition-all`}>
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs font-medium text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center space-x-3">
          {actions}
        </div>
      )}
    </header>
  );
};

