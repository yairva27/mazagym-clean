import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../contexts/AuthContext';

interface AuthFormProps {
  type: 'login' | 'signup';
  role?: UserRole;
}

export const AuthForm: React.FC<AuthFormProps> = ({ type, role }) => {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (type === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('הסיסמאות אינן תואמות');
        }
        if (!role) {
          throw new Error('נדרשת בחירת תפקיד');
        }
        await signup(email, password, fullName, role, role === 'trainee' ? invitationCode : undefined);
        
        // After successful signup, redirect based on role
        if (role === 'coach') {
          navigate('/coach/invitation');
        } else {
          navigate('/settings/avatar');
        }
      } else {
        await login(email, password);
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('auth/invalid-email')) {
          setError('כתובת האימייל אינה תקינה');
        } else if (err.message.includes('auth/user-disabled')) {
          setError('חשבון זה הושבת. אנא פנה לתמיכה');
        } else if (err.message.includes('auth/user-not-found') || err.message.includes('auth/wrong-password')) {
          setError('האימייל או הסיסמה שגויים');
        } else if (err.message.includes('auth/too-many-requests')) {
          setError('יותר מדי ניסיונות התחברות. אנא נסה שוב מאוחר יותר');
        } else if (err.message.includes('auth/network-request-failed')) {
          setError('בעיית תקשורת. אנא בדוק את החיבור שלך ונסה שוב');
        } else if (type === 'signup') {
          setError(err.message);
        } else {
          setError('האימייל או הסיסמה שגויים');
        }
      } else {
        setError('האימייל או הסיסמה שגויים');
      }
    } finally {
      setLoading(false);
    }
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
                onChange={(e) => setEmail(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
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
              className="group relative flex-1 flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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

          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="mr-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}; 