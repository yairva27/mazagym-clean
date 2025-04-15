console.log('=== CoachDashboard File Loaded ===');

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserData } from '../../types/user';

interface TraineeWithWorkout extends UserData {
  lastWorkoutUpdate?: Date;
  workoutPlanId?: string;
}

export const CoachDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [trainees, setTrainees] = useState<TraineeWithWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrainees = async () => {
      try {
        // Validate auth data
        console.log('=== Auth Data Validation ===');
        console.log('Current userData:', {
          uid: userData?.uid,
          role: userData?.role,
          exists: !!userData
        });

        if (!userData?.uid) {
          console.error('No userData.uid available');
          setError('שגיאה בטעינת נתוני משתמש');
          setLoading(false);
          return;
        }

        // Build and execute query
        console.log('=== Query Execution ===');
        console.log('Building query with params:', {
          coachId: userData.uid,
          role: 'trainee'
        });

        const usersRef = collection(db, 'users');
        console.log('Collection reference:', usersRef.path);

        const traineesQuery = query(
          usersRef,
          where('coachId', '==', userData.uid),
          where('role', '==', 'trainee')
        );

        console.log('Executing query...');
        const querySnapshot = await getDocs(traineesQuery);

        // Log raw query results
        console.log('=== Raw Query Results ===');
        console.log('QuerySnapshot:', {
          empty: querySnapshot.empty,
          size: querySnapshot.size,
          docs: querySnapshot.docs.map(doc => ({
            id: doc.id,
            exists: doc.exists(),
            data: doc.data()
          }))
        });

        if (querySnapshot.empty) {
          console.log('Query returned empty result');
          setTrainees([]);
          setLoading(false);
          return;
        }

        // Process and validate each trainee document
        console.log('=== Processing Trainees ===');
        const processedTrainees = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Processing document:', {
            id: doc.id,
            rawData: data
          });

          const trainee = {
            uid: doc.id,
            email: data.email || '',
            fullName: data.fullName || '',
            role: data.role || 'trainee',
            coachId: data.coachId || '',
            phoneNumber: data.phoneNumber || data.phone || '',
            avatar: data.avatar || '',
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as TraineeWithWorkout;

          console.log('Processed trainee:', trainee);
          return trainee;
        });

        console.log('=== Final State Update ===');
        console.log('Setting trainees state with:', processedTrainees);
        setTrainees(processedTrainees);

      } catch (err) {
        console.error('Error in fetchTrainees:', err);
        setError('שגיאה בטעינת המתאמנים');
      } finally {
        setLoading(false);
      }
    };

    fetchTrainees();
  }, [userData?.uid]);

  // Debug render state
  console.log('=== Render State ===', {
    loading,
    error,
    traineesCount: trainees.length,
    trainees: trainees
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4">טוען מתאמנים...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-2xl font-bold">לוח בקרה</h1>
          {userData?.invitationCode && (
            <div className="bg-white shadow rounded-lg p-4 w-full sm:w-auto">
              <div className="text-sm">
                <span className="font-semibold ml-2">קוד הזמנה למתאמנים:</span>
                <span className="bg-blue-50 px-3 py-1 rounded font-mono text-blue-700">
                  {userData.invitationCode}
                </span>
              </div>
            </div>
          )}
        </div>

        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        ) : trainees.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-medium mb-4">אין לך מתאמנים כרגע</h3>
              <p className="text-gray-600 mb-6">
                שתף את קוד ההזמנה שלך כדי שמתאמנים יוכלו להירשם למערכת
              </p>
              {userData?.invitationCode && (
                <div className="bg-blue-50 p-4 rounded-lg inline-block">
                  <p className="text-sm text-gray-600 mb-2">הקוד שלך:</p>
                  <span className="font-mono text-lg text-blue-700 font-semibold">
                    {userData.invitationCode}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trainees.map((trainee) => (
              <div key={trainee.uid} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <img
                      src={trainee.avatar || '/assets/avatars/default.png'}
                      alt={trainee.fullName}
                      className="w-16 h-16 rounded-full mr-4 object-cover border-2 border-gray-100"
                    />
                    <div>
                      <h3 className="font-medium text-lg">{trainee.fullName}</h3>
                      <p className="text-gray-600">{trainee.email}</p>
                      {trainee.phoneNumber && (
                        <p className="text-gray-600 text-sm">{trainee.phoneNumber}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Link
                      to={`/coach/trainee/${trainee.uid}/workout`}
                      className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      צפה בתוכנית אימון
                    </Link>
                    <Link
                      to={`/coach/trainee/${trainee.uid}/create-plan`}
                      className="block w-full text-center bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      צור תוכנית אימון חדשה
                    </Link>
                    <Link
                      to={`/coach/trainee/${trainee.uid}/edit-plan`}
                      className="block w-full text-center bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      ערוך תוכנית אימון
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CoachDashboard; 