import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkoutPlan } from '../../hooks/useWorkoutPlan';
import { WorkoutPlanDisplay } from '../../components/workout/WorkoutPlanDisplay';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserData } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';

export const TraineeDashboard: React.FC = () => {
  console.log('TraineeDashboard component rendering'); // Debug log
  
  const { userData } = useAuth();
  const { showNotification, showConfirmation } = useNotification();
  console.log('TraineeDashboard: userData received', { 
    exists: !!userData,
    role: userData?.role,
    uid: userData?.uid 
  }); // Debug log
  
  const { workoutPlan, loading: workoutLoading, error: workoutError } = useWorkoutPlan();
  console.log('TraineeDashboard: workoutPlan hook result', { 
    hasWorkoutPlan: !!workoutPlan,
    loading: workoutLoading,
    error: workoutError 
  }); // Debug log
  
  const [coach, setCoach] = useState<UserData | null>(null);
  const [coachLoading, setCoachLoading] = useState(true);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const fetchCoachData = async () => {
      if (!userData?.coachId) {
        console.log('No coachId found for trainee:', userData);
        setCoachLoading(false);
        return;
      }

      try {
        console.log('Fetching coach data for ID:', userData.coachId);
        const coachDoc = await getDoc(doc(db, 'users', userData.coachId));
        
        if (coachDoc.exists()) {
          const coachData = coachDoc.data() as UserData;
          console.log('Found coach data:', {
            name: coachData.fullName,
            email: coachData.email,
            phone: coachData.phoneNumber || coachData.phone
          });
          setCoach(coachData);
        } else {
          console.error('Coach document not found for ID:', userData.coachId);
          setCoachError('המאמן לא נמצא');
        }
      } catch (err) {
        console.error('Error fetching coach data:', err);
        setCoachError('שגיאה בטעינת פרטי המאמן');
      } finally {
        setCoachLoading(false);
      }
    };

    fetchCoachData();
  }, [userData?.coachId]);

  const handleResetWeek = async () => {
    if (!workoutPlan) return;
    
    setResetting(true);
    try {
      // Get the active workout plan document
      const planRef = doc(db, 'workoutPlans', workoutPlan.id);
      const planDoc = await getDoc(planRef);
      
      if (!planDoc.exists()) {
        throw new Error('תוכנית האימון לא נמצאה');
      }
      
      const planData = planDoc.data();
      const updatedDays = planData.days.map((day: any) => {
        // Reset each exercise in the day
        const updatedExercises = day.exercises.map((exercise: any) => ({
          ...exercise,
          completed: false,
          completedAt: null
        }));
        
        return {
          ...day,
          exercises: updatedExercises
        };
      });
      
      // Update the workout plan with reset exercises
      await updateDoc(planRef, {
        days: updatedDays,
        updatedAt: Timestamp.now()
      });
      
      // Show success notification
      showNotification('השבוע החדש התחיל! כל הסימונים אופסו.', 'success');
      
      // Reload the page to refresh the workout plan
      window.location.reload();
    } catch (error) {
      console.error('Error resetting workout plan:', error);
      showNotification('שגיאה באיפוס תוכנית האימון', 'error');
    } finally {
      setResetting(false);
    }
  };

  if (coachLoading || workoutLoading) {
    console.log('TraineeDashboard: showing loading state', { coachLoading, workoutLoading }); // Debug log
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  console.log('TraineeDashboard: rendering main content', {
    hasCoach: !!coach,
    hasWorkoutPlan: !!workoutPlan,
    coachError,
    workoutError
  }); // Debug log

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">לוח בקרה</h1>
          <div className="flex gap-2">
            {userData?.role === 'trainee' && workoutPlan && (
              <button
                onClick={() => showConfirmation(
                  'להתחיל שבוע חדש?',
                  'האם אתה בטוח שתרצה לאפס את כל הסימונים של התרגילים שבוצעו?',
                  handleResetWeek,
                  'warning'
                )}
                disabled={resetting}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetting ? 'מאפס...' : 'התחלת שבוע חדש'}
              </button>
            )}
            <Link
              to="/settings"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              הגדרות
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto space-y-8">
          {/* Coach Details Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">פרטי המאמן</h2>
              <p className="mt-1 text-sm text-gray-500">
                פרטי הקשר של המאמן שלך
              </p>
            </div>

            <div className="border-t border-gray-200">
              {coachError ? (
                <div className="px-4 py-5 sm:p-6">
                  <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-sm text-red-700">{coachError}</p>
                  </div>
                </div>
              ) : coach ? (
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <img
                      src={coach.avatar || '/assets/avatars/default.png'}
                      alt={coach.fullName}
                      className="w-16 h-16 rounded-full"
                    />
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{coach.fullName}</h3>
                      <p className="text-sm text-gray-500">{coach.email}</p>
                      {(coach.phoneNumber || coach.phone) && (
                        <p className="text-sm text-gray-500 mt-1">
                          טלפון: {coach.phoneNumber || coach.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-5 sm:p-6">
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">לא נמצאו פרטי מאמן</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Workout Plan Section */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">תוכנית האימון שלי</h2>
              <p className="mt-1 text-sm text-gray-500">
                תוכנית האימון הנוכחית שלך
              </p>
            </div>

            <div className="border-t border-gray-200">
              {workoutError ? (
                <div className="px-4 py-5 sm:p-6">
                  <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-sm text-red-700">{workoutError}</p>
                  </div>
                </div>
              ) : workoutPlan ? (
                <div className="px-4 py-5 sm:p-6">
                  <WorkoutPlanDisplay workoutPlan={workoutPlan} />
                </div>
              ) : (
                <div className="px-4 py-5 sm:p-6">
                  <div className="text-center py-8">
                    <p className="text-xl font-medium text-gray-700 mb-4">לא נמצאה תוכנית אימון</p>
                    <p className="text-gray-500 mb-6">אנא צור תוכנית אימון חדשה</p>
                    <Link
                      to="/settings"
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      צור תוכנית אימון
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TraineeDashboard; 