import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../contexts/AuthContext';

interface AuthFormProps {
  type: 'login' | 'signup';
  role?: UserRole;
  onLogin?: (email: string, password: string) => Promise<void>;
  error?: string;
  isLoading?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({ 
  type, 
  role, 
  onLogin, 
  error: externalError,
  isLoading: externalLoading 
}) => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [internalError, setInternalError] = useState('');
  const [internalLoading, setInternalLoading] = useState(false);

  // Use external states if provided (for login), otherwise use internal states (for signup)
  const error = type === 'login' ? externalError : internalError;
  const loading = type === 'login' ? externalLoading : internalLoading;

  const validateForm = () => {
    if (!email.trim()) {
      setInternalError('נא להזין כתובת אימייל');
      return false;
    }
    if (!password.trim()) {
      setInternalError('נא להזין סיסמה');
      return false;
    }
    if (type === 'signup') {
      if (!fullName.trim()) {
        setInternalError('נא להזין שם מלא');
        return false;
      }
      if (!role) {
        setInternalError('נדרשת בחירת תפקיד');
        return false;
      }
      if (password.length < 6) {
        setInternalError('הסיסמה חייבת להכיל לפחות 6 תווים');
        return false;
      }
      if (password !== confirmPassword) {
        setInternalError('הסיסמאות אינן תואמות');
        return false;
      }
      if (role === 'trainee' && !invitationCode.trim()) {
        setInternalError('נא להזין קוד הזמנה');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    if (type === 'login' && onLogin) {
      await onLogin(email, password);
    } else if (type === 'signup') {
      setInternalLoading(true);
      try {
        if (!role) {
          throw new Error('נדרשת בחירת תפקיד');
        }
        await signup(email, password, fullName, role, role === 'trainee' ? invitationCode : undefined);
        
        if (role === 'coach') {
          navigate('/coach/invitation');
        } else {
          navigate('/settings/avatar');
        }
      } catch (err) {
        if (err instanceof Error) {
          setInternalError(err.message);
        } else {
          setInternalError('אירעה שגיאה. נסה שוב מאוחר יותר.');
        }
      } finally {
        setInternalLoading(false);
      }
    }
  };

  // Clear error when user edits email or password
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setInternalError('');
  };
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setInternalError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {type === 'login' ? 'התחבר לחשבון שלך' : 'צור חשבון חדש'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {type === 'signup' && (
              <div>
                <label htmlFor="fullName" className="sr-only">
                  שם מלא
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="שם מלא"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="sr-only">
                אימייל
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="אימייל"
                value={email}
                onChange={handleEmailChange}
              />
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                סיסמה
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={type === 'login' ? 'current-password' : 'new-password'}
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="סיסמה"
                value={password}
                onChange={handlePasswordChange}
              />
            </div>

            {type === 'signup' && (
              <>
                <div>
                  <label htmlFor="confirmPassword" className="sr-only">
                    אישור סיסמה
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="אישור סיסמה"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {role === 'trainee' && (
                  <div>
                    <label htmlFor="invitationCode" className="sr-only">
                      קוד הזמנה
                    </label>
                    <input
                      id="invitationCode"
                      name="invitationCode"
                      type="text"
                      required
                      className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="קוד הזמנה"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex space-x-4 space-x-reverse">
            <button
              type="submit"
              disabled={loading}
              className="group relative flex-1 flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </span>
              ) : null}
              {type === 'login' ? 'התחבר' : 'הרשמה'}
            </button>
            {type === 'login' && (
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                הירשם
              </button>
            )}
          </div>
        </form>
        {error && (
          <div className="text-red-600 text-center font-bold mt-4">{error}</div>
        )}
      </div>
    </div>
  );
}; 