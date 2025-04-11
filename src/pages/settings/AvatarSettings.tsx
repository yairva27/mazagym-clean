import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import AvatarSelection from '../../components/AvatarSelection';
import { useAuth } from '../../contexts/AuthContext';

const AvatarSettings: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  const handleAvatarSelected = () => {
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
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">בחר אווטאר</h1>
            <button
              onClick={() => navigate('/settings')}
              className="text-gray-600 hover:text-gray-800"
            >
              חזרה להגדרות
            </button>
          </div>
          <AvatarSelection onSelect={handleAvatarSelected} />
        </div>
      </div>
    </Layout>
  );
};

export default AvatarSettings; 