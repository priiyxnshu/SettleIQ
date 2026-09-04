import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={`${subtitle ? 'h-20' : 'h-16'} bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-8 flex items-center justify-between sticky top-0 z-20 transition-all`}>
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center space-x-3">
        {actions}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer shrink-0"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4 transition-transform duration-200" />
          ) : (
            <Moon className="h-4 w-4 transition-transform duration-200" />
          )}
        </button>
      </div>
    </header>
  );
};


