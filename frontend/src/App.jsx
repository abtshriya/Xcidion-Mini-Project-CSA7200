import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Pages
import { LoginPage } from './pages/LoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { UserDashboardPage } from './pages/UserDashboardPage';

import './App.css';

// Guard for authenticated access
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-main)'
      }}>
        <LoadingSpinner message="Authenticating session..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Route wrapper for login page to prevent authenticated users from re-logging in
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, role } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-main)'
      }}>
        <LoadingSpinner message="Checking authentication..." />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={role === 'viewer' ? '/user' : '/admin'} replace />;
  }

  return children;
};

// Role-based root dashboard router
const DashboardRouter = () => {
  const { role } = useAuth();
  if (role === 'viewer') {
    return <UserDashboardPage />;
  }
  return <AdminDashboardPage />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <Routes>
            {/* Public Auth Route */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />

            {/* Protected App Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardRouter />} />
              <Route path="admin" element={<AdminDashboardPage />} />
              <Route path="user" element={<UserDashboardPage />} />
            </Route>

            {/* Fallback to root */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
