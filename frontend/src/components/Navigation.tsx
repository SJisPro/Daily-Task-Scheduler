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
    <nav className="bg-white shadow-lg rounded-b-2xl mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              📅 Task Scheduler
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleViewChange('day')}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${currentView === 'day'
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'text-gray-700 hover:text-primary-600'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <SunIcon className="w-4 h-4" />
                  Day
                </div>
              </button>
              <button
                onClick={() => handleViewChange('week')}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${currentView === 'week'
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'text-gray-700 hover:text-primary-600'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-4 h-4" />
                  Week
                </div>
              </button>
              <button
                onClick={() => handleViewChange('month')}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${currentView === 'month'
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'text-gray-700 hover:text-primary-600'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  Month
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

