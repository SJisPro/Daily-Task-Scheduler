import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';
import DayView from './pages/DayView';
import WeekView from './pages/WeekView';
import MonthView from './pages/MonthView';

function AppContent() {
  const location = useLocation();

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const getCurrentView = () => {
    if (location.pathname === '/week') return 'week';
    if (location.pathname === '/month') return 'month';
    return 'day';
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Navigation currentView={getCurrentView()} />

          <Routes>
            <Route path="/" element={<Navigate to="/day" replace />} />
            <Route path="/day" element={<DayView />} />
            <Route path="/week" element={<WeekView />} />
            <Route path="/month" element={<MonthView />} />
          </Routes>
        </div>
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

