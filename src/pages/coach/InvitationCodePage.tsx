import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Layout } from '../../components/layout/Layout';
import { InvitationCode } from '../../components/coach/InvitationCode';

export const InvitationCodePage: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userData || userData.role !== 'coach') {
      navigate('/');
    }
  }, [userData, navigate]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-4">ברוך הבא למערכת!</h1>
          <p className="text-gray-600">
            זהו קוד ההזמנה שלך. שתף אותו עם המתאמנים שלך כדי שיוכלו להצטרף למערכת.
          </p>
        </div>
        
        <InvitationCode />
      </div>
    </Layout>
  );
}; 