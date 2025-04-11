import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense } from 'react';
import { AuthProvider, UserData, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { Layout } from './components/layout/Layout';
import { SettingsPage } from './pages/settings/SettingsPage';
import Settings from './pages/settings/Settings';
import AvatarSettings from './pages/settings/AvatarSettings';
import CoachInfo from './pages/trainee/CoachInfo';
import { InvitationCodePage } from './pages/coach/InvitationCodePage';

// Placeholder components for protected routes
const CoachDashboard = () => (
  <Layout>
    <div>לוח בקרה למאמן</div>
  </Layout>
);

const TraineeDashboard = () => (
  <Layout>
    <div>לוח בקרה למתאמן</div>
  </Layout>
);

function App() {
  return (
    <Router>
      <AuthProvider>
        <div dir="rtl">
          <Suspense fallback={<div>טוען...</div>}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />

              {/* Protected routes */}
              <Route
                path="/coach/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['coach']}>
                    <CoachDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/coach/invitation"
                element={
                  <ProtectedRoute allowedRoles={['coach']}>
                    <InvitationCodePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trainee/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['trainee']}>
                    <TraineeDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings/avatar"
                element={
                  <ProtectedRoute>
                    <AvatarSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trainee/coach/:coachId"
                element={
                  <ProtectedRoute allowedRoles={['trainee']}>
                    <CoachInfo />
                  </ProtectedRoute>
                }
              />

              {/* Redirect root to appropriate dashboard based on role */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <RootRedirect />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Suspense>
        </div>
      </AuthProvider>
    </Router>
  );
}

// Separate component for root redirect to handle userData properly
const RootRedirect = () => {
  const { userData } = useAuth();
  
  if (userData?.role === 'coach') {
    return <Navigate to="/coach/dashboard" replace />;
  }
  return <Navigate to="/trainee/dashboard" replace />;
};

export default App; 