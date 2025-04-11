import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Layout } from '../../components/layout/Layout';
import { UserData } from '../../contexts/AuthContext';

const CoachInfo: React.FC = () => {
  const { coachId } = useParams<{ coachId: string }>();
  const [coach, setCoach] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCoachData = async () => {
      if (!coachId) return;

      try {
        const coachDoc = await getDoc(doc(db, 'users', coachId));
        if (coachDoc.exists()) {
          setCoach(coachDoc.data() as UserData);
        } else {
          setError('המאמן לא נמצא');
        }
      } catch (err) {
        setError('שגיאה בטעינת פרטי המאמן');
        console.error('Error fetching coach data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCoachData();
  }, [coachId]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error || !coach) {
    return (
      <Layout>
        <div className="text-center text-red-500">{error || 'המאמן לא נמצא'}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col items-center mb-6">
            <img
              src={coach.avatar || '/assets/avatars/default.png'}
              alt={coach.fullName}
              className="w-32 h-32 rounded-full mb-4"
            />
            <h1 className="text-2xl font-bold">{coach.fullName}</h1>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-gray-600">שם המאמן</span>
              <span className="text-lg">{coach.fullName}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-gray-600">אימייל המאמן</span>
              <span className="text-lg">{coach.email}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-gray-600">טלפון המאמן</span>
              <span className="text-lg">{coach.phone || 'לא צוין'}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CoachInfo; 