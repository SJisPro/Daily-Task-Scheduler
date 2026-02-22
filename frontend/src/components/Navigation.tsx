import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ViewMode } from '../types';
import { CalendarDaysIcon, CalendarIcon, SunIcon } from '@heroicons/react/24/outline';

interface NavigationProps {
  currentView: ViewMode;
}

const Navigation: React.FC<NavigationProps> = ({ currentView }) => {
  const navigate = useNavigate();

  const handleViewChange = (view: ViewMode) => {
    navigate(`/${view}`);
  };

  return (
    <nav className="glass rounded-2xl mb-6 sm:mb-8 px-4 sm:px-6 py-3 sm:py-4 shadow-card">
      <div className="flex justify-between items-center">
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)', boxShadow: '0 4px 14px rgba(20,184,166,0.45)' }}>
            <span className="text-base sm:text-lg">📅</span>
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-none"
              style={{ background: 'linear-gradient(90deg, #2dd4bf, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Task Scheduler
            </h1>
            <p className="hidden sm:block text-[10px] text-slate-500 font-medium tracking-widest uppercase leading-tight mt-0.5">
              Daily Planner
            </p>
          </div>
        </div>

        {/* View switcher */}
        <div className="flex items-center p-1 rounded-xl" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(51,65,85,0.6)' }}>
          {([
            { view: 'day' as ViewMode, label: 'Day', Icon: SunIcon },
            { view: 'week' as ViewMode, label: 'Week', Icon: CalendarDaysIcon },
            { view: 'month' as ViewMode, label: 'Month', Icon: CalendarIcon },
          ] as const).map(({ view, label, Icon }) => (
            <button
              key={view}
              id={`nav-${view}`}
              onClick={() => handleViewChange(view)}
              className={`nav-btn ${currentView === view ? 'active' : ''} !px-3 sm:!px-4`}
              title={label}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
