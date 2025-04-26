import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthForm } from '../../components/auth/AuthForm';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, login } = useAuth();
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Only redirect if we have a currentUser AND we're not in the middle of a login attempt
  React.useEffect(() => {
    if (currentUser && !isLoggingIn) {
      const from = (location.state as any)?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [currentUser, isLoggingIn, navigate, location]);

  const handleLogin = useCallback(async (email: string, password: string) => {
    setError(""); // Clear previous errors
    setIsLoggingIn(true);
    
    try {
      await login(email, password);
      // Success - navigation will happen via useEffect
    } catch (err: any) {
      console.log('Login error caught:', err);
      if (
        err?.code === 'auth/user-not-found' ||
        err?.code === 'auth/wrong-password' ||
        err?.code === 'auth/invalid-credential'
      ) {
        setError('המייל או הסיסמה שגויים');
      } else {
        setError('אירעה שגיאה. נסה שוב מאוחר יותר.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  }, [login]);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            <AuthForm 
              type="login"
              onLogin={handleLogin}
              error={error}
              isLoading={isLoggingIn}
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 