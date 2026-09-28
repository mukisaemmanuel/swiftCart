import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  showLabel = false,
  className = '',
  size = 'md',
}) => {
  const { isDark, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'p-1.5 text-xs',
    md: 'p-2 text-xs sm:px-2.5 sm:py-2',
    lg: 'p-2.5 text-sm px-3.5 py-2.5',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`rounded-xl border transition-all duration-200 flex items-center gap-1.5 group select-none ${
        isDark
          ? 'bg-slate-800/90 hover:bg-slate-700/90 text-amber-300 border-slate-700 shadow-xs'
          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs'
      } ${sizeClasses[size]} ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Sun className={`${iconSizes[size]} text-amber-400 rotate-0 transition-transform duration-300 group-hover:rotate-45`} />
        ) : (
          <Moon className={`${iconSizes[size]} text-slate-700 -rotate-12 transition-transform duration-300 group-hover:rotate-0`} />
        )}
      </div>

      {showLabel && (
        <span className="font-bold text-xs">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
};
