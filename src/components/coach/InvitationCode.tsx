import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const InvitationCode: React.FC = () => {
  const navigate = useNavigate();
  const { userData, generateInvitationCode, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Automatically generate invitation code on first render if not already set
  useEffect(() => {
    const generateCode = async () => {
      if (userData?.role === 'coach' && !userData.invitationCode) {
        setLoading(true);
        try {
          // First refresh user data to make sure we have the latest
          await refreshUserData();
          
          // If still no invitation code, generate one
          if (!userData?.invitationCode) {
            await generateInvitationCode();
          }
        } catch (err) {
          console.error('Error generating invitation code:', err);
          setError(err instanceof Error ? err.message : 'שגיאה ביצירת קוד הזמנה');
        } finally {
          setLoading(false);
        }
      }
    };

    generateCode();
  }, [userData, generateInvitationCode, refreshUserData]);

  if (!userData || userData.role !== 'coach') {
    return null;
  }

  const handleContinue = () => {
    navigate('/settings/avatar');
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">קוד הזמנה</h2>
      
      {userData.invitationCode ? (
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">שתף את הקוד הזה עם המתאמנים שלך:</p>
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-2xl font-bold text-green-700 text-center">{userData.invitationCode}</p>
          </div>
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleContinue}
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              המשך
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-sm text-gray-500">יוצר קוד הזמנה...</p>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}; 