import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import AvatarSelection from '../../components/AvatarSelection';
import { useAuth } from '../../contexts/AuthContext';

const AvatarSettings: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleAvatarSelected = () => {
    // No need to check userData.avatar here since the AvatarSelection component
    // already handles the selection and update process
    // The onSelect callback is only called after a successful update
    
    // Navigate based on user role
    if (userData?.role === 'coach') {
      navigate('/coach/dashboard');
    } else {
      navigate('/trainee/dashboard');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">בחר אווטאר</h1>
            <p className="text-gray-600 mt-2">נא לבחור אווטאר כדי להמשיך</p>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <AvatarSelection onSelect={handleAvatarSelected} />
        </div>
      </div>
    </Layout>
  );
};

export default AvatarSettings; 