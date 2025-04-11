import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { WorkoutPlan } from '../types/workout';
import { useAuth } from '../contexts/AuthContext';

export const useWorkoutPlan = () => {
  const { userData } = useAuth();
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkoutPlan = async () => {
      if (!userData || userData.role !== 'trainee') {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query the workout plans collection for the active plan
        const workoutPlansRef = collection(db, 'workoutPlans');
        const q = query(
          workoutPlansRef,
          where('traineeId', '==', userData.uid),
          where('isActive', '==', true),
          orderBy('updatedAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setWorkoutPlan(null);
        } else {
          // Get the most recent active plan
          const planDoc = querySnapshot.docs[0];
          const planData = planDoc.data();
          
          // Convert Firestore Timestamps to JavaScript Date objects
          const workoutPlan: WorkoutPlan = {
            ...planData,
            id: planDoc.id,
            createdAt: planData.createdAt instanceof Timestamp 
              ? planData.createdAt.toDate() 
              : new Date(planData.createdAt),
            updatedAt: planData.updatedAt instanceof Timestamp 
              ? planData.updatedAt.toDate() 
              : new Date(planData.updatedAt),
            lastWorkoutDate: planData.lastWorkoutDate instanceof Timestamp 
              ? planData.lastWorkoutDate.toDate() 
              : planData.lastWorkoutDate ? new Date(planData.lastWorkoutDate) : undefined,
            days: planData.days.map((day: any) => ({
              ...day,
              lastCompleted: day.lastCompleted instanceof Timestamp 
                ? day.lastCompleted.toDate() 
                : day.lastCompleted ? new Date(day.lastCompleted) : undefined,
              exercises: day.exercises.map((exercise: any) => ({
                ...exercise,
                performance: exercise.performance?.map((perf: any) => ({
                  ...perf,
                  timestamp: perf.timestamp instanceof Timestamp 
                    ? perf.timestamp.toDate() 
                    : new Date(perf.timestamp)
                }))
              }))
            }))
          };
          
          setWorkoutPlan(workoutPlan);
        }
      } catch (err) {
        console.error('Error fetching workout plan:', err);
        setError('Failed to load workout plan. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutPlan();
  }, [userData]);

  return { workoutPlan, loading, error };
}; 