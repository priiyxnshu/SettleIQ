/**
 * Application Header Component
 *
 * Top navigation bar providing active view title, contextual action slots,
 * current operational date pill, and light/dark theme toggle button.
 */

import React from 'react';
import { Sun, Moon, Calendar, Menu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  title: string;
  actions?: React.ReactNode;
  onToggleMobileMenu?: () => void;
}

/**
 * Top persistent header component rendered above the active view content.
 */
export const Header: React.FC<HeaderProps> = ({
  title,
  actions,
  onToggleMobileMenu
}) => {
  const { theme, toggleTheme } = useTheme();

  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="h-16 bg-[#e8edf5]/95 dark:bg-slate-950/95 backdrop-blur-md px-6 sm:px-8 flex items-center justify-between sticky top-0 z-20 transition-all">
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            type="button"
            aria-label="Open navigation menu"
            className="md:hidden neu-extruded-btn h-9 w-9 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer"
          >
            <Menu className="h-4 w-4" />
          </button>
        )}
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">{title}</h2>
      </div>
      <div className="flex items-center space-x-3">
        {actions}

        {/* Date Filter Pill */}
        <div className="neu-extruded-btn px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hidden md:flex items-center gap-2 select-none">
          <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Today: {formattedDate}</span>
        </div>

        {/* Tactile Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="neu-extruded-btn h-9 w-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-amber-400 transition-colors shrink-0"
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


