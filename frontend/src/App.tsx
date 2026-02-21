import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';
import DayView from './pages/DayView';
import WeekView from './pages/WeekView';
import MonthView from './pages/MonthView';
import { useReminders } from './hooks/useReminders';

function AppContent() {
  const location = useLocation();

  // 🔔 Start the reminder polling loop for the lifetime of the app
  useReminders();

  const getCurrentView = () => {
    if (location.pathname === '/week') return 'week';
    if (location.pathname === '/month') return 'month';
    return 'day';
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen pb-16">
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
