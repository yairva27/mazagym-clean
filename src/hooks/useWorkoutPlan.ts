import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { WorkoutPlan } from '../types/workout';
import { useAuth } from '../contexts/AuthContext';

export const useWorkoutPlan = () => {
  console.log('useWorkoutPlan hook initialized'); // Debug log
  
  const { userData } = useAuth();
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('useWorkoutPlan useEffect triggered', { userData }); // Debug log

    const fetchWorkoutPlan = async () => {
      if (!userData || userData.role !== 'trainee') {
        console.log('Not a trainee or no user data:', {
          userExists: !!userData,
          role: userData?.role,
          uid: userData?.uid
        });
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Fetching workout plan for trainee:', {
          traineeId: userData.uid,
          coachId: userData.coachId
        });

        // Query the workout plans collection for the active plan
        const workoutPlansRef = collection(db, 'workoutPlans');
        const q = query(
          workoutPlansRef,
          where('traineeId', '==', userData.uid),
          where('isActive', '==', true),
          orderBy('updatedAt', 'desc')
        );

        console.log('Executing Firestore query...'); // Debug log
        const querySnapshot = await getDocs(q);
        console.log('Workout plans query result:', {
          plansFound: querySnapshot.size,
          empty: querySnapshot.empty,
          traineeId: userData.uid
        });
        
        if (querySnapshot.empty) {
          console.log('No workout plans found for trainee:', userData.uid);
          setWorkoutPlan(null);
        } else {
          // Get the most recent active plan
          const planDoc = querySnapshot.docs[0];
          const planData = planDoc.data();
          console.log('Found workout plan:', {
            planId: planDoc.id,
            workoutPlanName: planData.workoutPlanName || planData.name,
            traineeId: planData.traineeId,
            coachId: planData.coachId,
            isActive: planData.isActive,
            hasExercises: !!planData.exercises?.length,
            hasDays: !!planData.days?.length,
            daysCount: planData.days?.length,
            firstDayExercises: planData.days?.[0]?.exercises?.length
          });
          
          // Convert Firestore Timestamps to JavaScript Date objects
          const workoutPlan: WorkoutPlan = {
            id: planDoc.id,
            traineeId: planData.traineeId,
            coachId: planData.coachId,
            workoutPlanName: planData.workoutPlanName || planData.name || 'Untitled Plan',
            name: planData.name || planData.workoutPlanName, // For backward compatibility
            description: planData.description || '',
            isActive: planData.isActive || false,
            createdAt: planData.createdAt instanceof Timestamp 
              ? planData.createdAt.toDate() 
              : new Date(planData.createdAt),
            updatedAt: planData.updatedAt instanceof Timestamp 
              ? planData.updatedAt.toDate() 
              : new Date(planData.updatedAt),
            lastWorkoutDate: planData.lastWorkoutDate instanceof Timestamp 
              ? planData.lastWorkoutDate.toDate() 
              : planData.lastWorkoutDate ? new Date(planData.lastWorkoutDate) : undefined,
            days: (planData.days || []).map((day: any) => ({
              id: day.id || crypto.randomUUID(),
              name: day.name || day.dayName || 'Untitled Day',
              exercises: (day.exercises || []).map((exercise: any) => ({
                id: exercise.id || crypto.randomUUID(),
                name: exercise.name || '',
                sets: exercise.sets || 0,
                reps: exercise.reps || 0,
                weight: exercise.weight,
                notes: exercise.notes,
                restTime: exercise.restTime,
                performance: exercise.performance?.map((perf: any) => ({
                  setNumber: perf.setNumber || 1,
                  weight: perf.weight,
                  reps: perf.reps,
                  completed: perf.completed || false,
                  notes: perf.notes,
                  timestamp: perf.timestamp instanceof Timestamp 
                    ? perf.timestamp.toDate() 
                    : new Date(perf.timestamp)
                }))
              })),
              notes: day.notes,
              lastCompleted: day.lastCompleted instanceof Timestamp 
                ? day.lastCompleted.toDate() 
                : day.lastCompleted ? new Date(day.lastCompleted) : undefined
            }))
          };
          
          console.log('Setting workout plan with days:', workoutPlan.days.length); // Debug log
          setWorkoutPlan(workoutPlan);
        }
      } catch (err) {
        console.error('Error fetching workout plan:', err);
        setError('Failed to load workout plan. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutPlan().catch(err => {
      console.error('Unhandled error in fetchWorkoutPlan:', err);
      setError('An unexpected error occurred');
      setLoading(false);
    });

    return () => {
      console.log('useWorkoutPlan cleanup'); // Debug log
    };
  }, [userData]);

  return { workoutPlan, loading, error };
}; 