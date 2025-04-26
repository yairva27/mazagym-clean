import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useCoachWorkoutPlans } from '../../hooks/useCoachWorkoutPlans';
import { WorkoutPlanDisplay } from '../../components/workout/WorkoutPlanDisplay';
import { WorkoutPlan } from '../../types/workout';

export const ViewTraineeWorkout: React.FC = () => {
  const { traineeId } = useParams<{ traineeId: string }>();
  const navigate = useNavigate();
  const { workoutPlans, loading, error } = useCoachWorkoutPlans(traineeId || '');
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    if (workoutPlans.length > 0) {
      const active = workoutPlans.find(plan => plan.isActive);
      setActivePlan(active || null);
    } else {
      setActivePlan(null);
    }
  }, [workoutPlans]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center text-red-500 p-4">{error}</div>
        <div className="text-center mt-4">
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center"
          >
            <span className="mr-2">←</span>
            חזור
          </button>
        </div>
      </Layout>
    );
  }

  if (!activePlan) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">תוכנית אימון למתאמן</h1>
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center"
            >
              <span className="mr-2">←</span>
              חזור
            </button>
          </div>
          <div className="text-center text-gray-600 p-8">
            <p className="mb-4 text-lg">לא נמצאה תוכנית אימון פעילה למתאמן זה.</p>
            <button
              onClick={() => navigate(`/coach/trainee/${traineeId}/create-plan`)}
              style={{ backgroundColor: '#2563eb', color: '#fff', borderRadius: '8px', padding: '8px 16px' }}
              className="font-semibold shadow hover:bg-blue-700 transition-colors"
            >
              צור תוכנית אימון חדשה
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">תוכנית אימון למתאמן</h1>
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center"
          >
            <span className="mr-2">←</span>
            חזור
          </button>
        </div>
        <WorkoutPlanDisplay workoutPlan={activePlan} />
      </div>
    </Layout>
  );
};

export default ViewTraineeWorkout; 