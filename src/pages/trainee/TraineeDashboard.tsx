import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkoutPlan } from '../../hooks/useWorkoutPlan';
import { WorkoutPlanDisplay } from '../../components/workout/WorkoutPlanDisplay';

export const TraineeDashboard: React.FC = () => {
  const { userData } = useAuth();
  const { workoutPlan, loading, error } = useWorkoutPlan();

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">לוח בקרה</h1>
          <div className="flex space-x-4">
            <Link
              to={`/trainee/coach/${userData?.coachId}`}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
            >
              פרטי המאמן
            </Link>
            <Link
              to="/settings"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              הגדרות
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">תוכנית האימון שלך</h2>
              <p className="mt-1 text-sm text-gray-500">
                עקוב אחר תוכנית האימון שהותאמה עבורך
              </p>
            </div>

            <div className="border-t border-gray-200">
              {loading ? (
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                </div>
              ) : error ? (
                <div className="px-4 py-5 sm:p-6">
                  <div className="bg-red-50 p-4 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              ) : !workoutPlan ? (
                <div className="px-4 py-5 sm:p-6">
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
                    <h3 className="mt-2 text-sm font-medium text-gray-900">אין עדיין תוכנית אימון</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      המאמן שלך יקבל עבורך תוכנית אימון בקרוב
                    </p>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-5 sm:p-6">
                  <WorkoutPlanDisplay workoutPlan={workoutPlan} />
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