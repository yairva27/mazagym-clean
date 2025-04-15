import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useCoachWorkoutPlans } from '../../hooks/useCoachWorkoutPlans';
import { WorkoutPlanDisplay } from '../../components/workout/WorkoutPlanDisplay';
import { WorkoutPlan } from '../../types/workout';

export const ViewTraineeWorkout: React.FC = () => {
  const { traineeId } = useParams<{ traineeId: string }>();
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
      </Layout>
    );
  }

  if (!activePlan) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-6">תוכנית אימון למתאמן</h1>
            <div className="bg-white shadow rounded-lg p-8 max-w-md mx-auto">
              <p className="text-gray-600 mb-6">לא נמצאה תוכנית אימון למתאמן זה.</p>
              <Link
                to={`/coach/trainee/${traineeId}/create-plan`}
                className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
              >
                יצירת תוכנית אימון
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">תוכנית אימון למתאמן</h1>
        <WorkoutPlanDisplay workoutPlan={activePlan} />
      </div>
    </Layout>
  );
};

export default ViewTraineeWorkout; 