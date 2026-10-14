import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import Login from './features/auth/Login';
import Dashboard from './features/dashboard/Dashboard';
import CalendarView from './features/calendar/CalendarView';
import BookingsList from './features/bookings/BookingsList';
import BookingDetail from './features/bookings/BookingDetail';
import NewBooking from './features/bookings/NewBooking';
import CustomersList from './features/customers/CustomersList';
import GuestProfile from './features/customers/GuestProfile';
import PropertiesList from './features/properties/PropertiesList';
import PaymentsList from './features/payments/PaymentsList';
import ReportsList from './features/reports/ReportsList';
import Settings from './features/settings/Settings';
import { ToastProvider } from './context/ToastContext';

function ProtectedRoute({ session, children }: { session: any; children: React.ReactNode }) {
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [session, setSession] = useState<any>(localStorage.getItem('demo_session') === 'true');

  function handleLogin() {
    localStorage.setItem('demo_session', 'true');
    setSession(true);
  }

  function handleLogout() {
    localStorage.removeItem('demo_session');
    setSession(false);
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!session ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />} />
          
          <Route path="/" element={<ProtectedRoute session={session}><AppShell onLogout={handleLogout} /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="calendar" element={<CalendarView />} />
            <Route path="bookings" element={<BookingsList />} />
            <Route path="bookings/new" element={<NewBooking />} />
            <Route path="bookings/:id" element={<BookingDetail />} />
            <Route path="payments" element={<PaymentsList />} />
            <Route path="guests" element={<CustomersList />} />
            <Route path="guests/:id" element={<GuestProfile />} />
            <Route path="customers" element={<Navigate to="/guests" replace />} />
            <Route path="properties" element={<PropertiesList />} />
            <Route path="reports" element={<ReportsList />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
