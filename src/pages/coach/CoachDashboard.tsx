import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserData } from '../../contexts/AuthContext';
import { WorkoutPlan } from '../../types/workout';
import { Link } from 'react-router-dom';

interface TraineeData extends UserData {
  lastWorkoutUpdate?: Date;
  workoutPlanId?: string;
}

export const CoachDashboard: React.FC = () => {
  const { userData } = useAuth();
  const [trainees, setTrainees] = useState<TraineeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrainees = async () => {
      if (!userData || userData.role !== 'coach') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query users collection for trainees with this coach's invitation code
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('role', '==', 'trainee'),
          where('coachId', '==', userData.uid)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setTrainees([]);
        } else {
          // Get all trainees
          const traineesData: TraineeData[] = [];
          
          // For each trainee, get their active workout plan
          for (const doc of querySnapshot.docs) {
            const traineeData = doc.data() as TraineeData;
            
            // Query workout plans for this trainee
            const workoutPlansRef = collection(db, 'workoutPlans');
            const workoutQuery = query(
              workoutPlansRef,
              where('traineeId', '==', traineeData.uid),
              where('isActive', '==', true),
              orderBy('updatedAt', 'desc')
            );
            
            const workoutSnapshot = await getDocs(workoutQuery);
            
            if (!workoutSnapshot.empty) {
              const workoutPlan = workoutSnapshot.docs[0].data() as WorkoutPlan;
              traineeData.lastWorkoutUpdate = workoutPlan.updatedAt instanceof Timestamp 
                ? workoutPlan.updatedAt.toDate() 
                : new Date(workoutPlan.updatedAt);
              traineeData.workoutPlanId = workoutSnapshot.docs[0].id;
            }
            
            traineesData.push(traineeData);
          }
          
          setTrainees(traineesData);
        }
      } catch (err) {
        console.error('Error fetching trainees:', err);
        setError('שגיאה בטעינת המתאמנים. אנא נסה שוב מאוחר יותר.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrainees();
  }, [userData]);

  const formatDate = (date?: Date) => {
    if (!date) return 'מעולם';
    return new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" dir="rtl">
        <div className="py-6">
          <h1 className="text-2xl font-semibold text-gray-900">לוח בקרה למאמן</h1>
          <p className="mt-1 text-sm text-gray-500">
            ניהול המתאמנים ותוכניות האימון שלהם
          </p>
        </div>

        {/* Trainees List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">מתאמנים שלי</h2>
            <p className="mt-1 text-sm text-gray-500">
              צפייה וניהול תוכניות האימון של המתאמנים
            </p>
          </div>
          
          <div className="px-4 py-5 sm:p-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            ) : trainees.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">אין מתאמנים עדיין</h3>
                <p className="mt-1 text-sm text-gray-500">
                  שתף את קוד ההזמנה שלך עם מתאמנים כדי להתחיל.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {trainees.map((trainee) => (
                  <div
                    key={trainee.uid}
                    className="bg-white overflow-hidden shadow rounded-lg border border-gray-200"
                  >
                    <div className="px-4 py-5 sm:p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <img
                            className="h-12 w-12 rounded-full"
                            src={trainee.avatar || '/assets/avatars/default.png'}
                            alt={trainee.fullName}
                          />
                        </div>
                        <div className="mr-4">
                          <h3 className="text-lg font-medium text-gray-900">{trainee.fullName}</h3>
                          <p className="text-sm text-gray-500">{trainee.email}</p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm text-gray-500">
                          עדכון אחרון: {formatDate(trainee.lastWorkoutUpdate)}
                        </p>
                      </div>
                      <div className="mt-5 flex space-x-3 space-x-reverse">
                        {trainee.workoutPlanId ? (
                          <>
                            <Link
                              to={`/coach/trainee/${trainee.uid}/view`}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              צפה בתוכנית אימון
                            </Link>
                            <Link
                              to={`/coach/trainee/${trainee.uid}/edit`}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              ערוך תוכנית אימון
                            </Link>
                          </>
                        ) : (
                          <Link
                            to={`/coach/trainee/${trainee.uid}/edit`}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            צור תוכנית אימון
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}; 