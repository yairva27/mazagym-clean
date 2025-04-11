import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthForm } from '../../components/auth/AuthForm';
import { UserRole } from '../../contexts/AuthContext';

export const SignupPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const navigate = useNavigate();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center">
          <div className="w-full max-w-md">
            {!selectedRole ? (
              <div className="mt-8 space-y-6">
                <div>
                  <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    בחר את התפקיד שלך
                  </h2>
                  <p className="mt-2 text-center text-sm text-gray-600">
                    בחר כיצד תרצה להשתמש ב-MazaGym
                  </p>
                </div>
                <div className="mt-8 space-y-4">
                  <button
                    onClick={() => handleRoleSelect('coach')}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    אני מאמן
                  </button>
                  <button
                    onClick={() => handleRoleSelect('trainee')}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    אני מתאמן
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    כבר יש לך חשבון?{' '}
                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                      התחבר
                    </Link>
                  </p>
                </div>
              </div>
            ) : (
              <>
                <AuthForm type="signup" role={selectedRole} />
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setSelectedRole(null)}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    ← חזרה לבחירת תפקיד
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 