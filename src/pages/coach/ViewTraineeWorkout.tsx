import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { WorkoutPlan } from '../../types/workout';
import { UserData } from '../../contexts/AuthContext';

export const ViewTraineeWorkout: React.FC = () => {
  const { traineeId } = useParams<{ traineeId: string }>();
  const { userData } = useAuth();
  const [trainee, setTrainee] = useState<UserData | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userData || userData.role !== 'coach' || !traineeId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get trainee data
        const traineeDoc = await getDoc(doc(db, 'users', traineeId));
        if (!traineeDoc.exists()) {
          setError('Trainee not found');
          return;
        }

        const traineeData = traineeDoc.data() as UserData;
        if (traineeData.coachId !== userData.uid) {
          setError('You do not have permission to view this trainee');
          return;
        }

        setTrainee(traineeData);

        // Get active workout plan
        const workoutPlansRef = collection(db, 'workoutPlans');
        const q = query(
          workoutPlansRef,
          where('traineeId', '==', traineeId),
          where('isActive', '==', true)
        );

        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setWorkoutPlan(querySnapshot.docs[0].data() as WorkoutPlan);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userData, traineeId]);

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <div className="mt-4">
            <Link
              to="/coach/dashboard"
              className="text-blue-600 hover:text-blue-900"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            to="/coach/dashboard"
            className="text-blue-600 hover:text-blue-900"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {trainee?.fullName}'s Workout Plan
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {workoutPlan ? (
                <>Last updated: {formatDate(workoutPlan.updatedAt)}</>
              ) : (
                'No active workout plan'
              )}
            </p>
          </div>

          <div className="px-4 py-5 sm:p-6">
            {workoutPlan ? (
              <div className="space-y-6">
                {workoutPlan.days.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className="bg-gray-50 rounded-lg p-4"
                  >
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Day {dayIndex + 1}
                    </h3>
                    <div className="space-y-4">
                      {day.exercises.map((exercise, exerciseIndex) => (
                        <div
                          key={exerciseIndex}
                          className="bg-white rounded-lg p-4 shadow-sm"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {exercise.name}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {exercise.sets} sets × {exercise.reps} reps
                                {exercise.weight && ` @ ${exercise.weight}kg`}
                              </p>
                            </div>
                            {exercise.performance?.some(perf => perf.completed) && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                In Progress
                              </span>
                            )}
                          </div>
                          {exercise.notes && (
                            <div className="mt-2 text-sm text-gray-600">
                              <p className="font-medium">Notes:</p>
                              <p>{exercise.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
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
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No active workout plan
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Create a workout plan for this trainee to get started.
                </p>
                <div className="mt-6">
                  <Link
                    to={`/coach/trainee/${traineeId}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Create Workout Plan
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}; 