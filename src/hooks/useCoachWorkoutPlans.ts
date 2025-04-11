import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { WorkoutPlan, WorkoutDay, Exercise } from '../types/workout';
import { useAuth } from '../contexts/AuthContext';

interface UseCoachWorkoutPlansReturn {
  workoutPlans: WorkoutPlan[];
  loading: boolean;
  error: string | null;
  createWorkoutPlan: (name: string, description?: string) => Promise<string>;
  updateWorkoutPlan: (planId: string, updates: Partial<WorkoutPlan>) => Promise<void>;
  deleteWorkoutPlan: (planId: string) => Promise<void>;
  setActivePlan: (planId: string) => Promise<void>;
  addWorkoutDay: (planId: string, name: string) => Promise<void>;
  updateWorkoutDay: (planId: string, dayId: string, updates: Partial<WorkoutDay>) => Promise<void>;
  deleteWorkoutDay: (planId: string, dayId: string) => Promise<void>;
  addExercise: (planId: string, dayId: string, exercise: Omit<Exercise, 'id'>) => Promise<void>;
  updateExercise: (planId: string, dayId: string, exercise: Exercise) => Promise<void>;
  deleteExercise: (planId: string, dayId: string, exerciseId: string) => Promise<void>;
}

export const useCoachWorkoutPlans = (traineeId: string): UseCoachWorkoutPlansReturn => {
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userData } = useAuth();

  useEffect(() => {
    const fetchWorkoutPlans = async () => {
      try {
        const q = query(
          collection(db, 'workoutPlans'),
          where('traineeId', '==', traineeId)
        );
        const querySnapshot = await getDocs(q);
        const plans: WorkoutPlan[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          plans.push({
            ...data,
            id: doc.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt)
          } as WorkoutPlan);
        });
        setWorkoutPlans(plans);
        setError(null);
      } catch (err) {
        setError('Failed to fetch workout plans');
        console.error('Error fetching workout plans:', err);
      } finally {
        setLoading(false);
      }
    };

    if (traineeId) {
      fetchWorkoutPlans();
    }
  }, [traineeId]);

  const createWorkoutPlan = async (name: string, description?: string): Promise<string> => {
    try {
      if (!userData?.uid) {
        throw new Error('Coach ID not found');
      }

      const now = Timestamp.now().toDate();
      const newPlan: Omit<WorkoutPlan, 'id'> = {
        traineeId,
        coachId: userData.uid,
        name,
        description,
        isActive: false,
        days: [],
        createdAt: now,
        updatedAt: now
      };

      const docRef = doc(collection(db, 'workoutPlans'));
      await setDoc(docRef, {
        ...newPlan,
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now)
      });

      const createdPlan = { id: docRef.id, ...newPlan };
      setWorkoutPlans(prev => [...prev, createdPlan]);
      setError(null);
      return docRef.id;
    } catch (err) {
      setError('Failed to create workout plan');
      console.error('Error creating workout plan:', err);
      throw err;
    }
  };

  const updateWorkoutPlan = async (planId: string, updates: Partial<WorkoutPlan>): Promise<void> => {
    try {
      const now = Timestamp.now().toDate();
      const planRef = doc(db, 'workoutPlans', planId);
      const updatedPlan = {
        ...updates,
        updatedAt: Timestamp.fromDate(now)
      };
      await updateDoc(planRef, updatedPlan);
      
      setWorkoutPlans(prev =>
        prev.map(plan =>
          plan.id === planId ? { ...plan, ...updates, updatedAt: now } : plan
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to update workout plan');
      console.error('Error updating workout plan:', err);
      throw err;
    }
  };

  const deleteWorkoutPlan = async (planId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'workoutPlans', planId));
      setWorkoutPlans(prev => prev.filter(plan => plan.id !== planId));
      setError(null);
    } catch (err) {
      setError('Failed to delete workout plan');
      console.error('Error deleting workout plan:', err);
      throw err;
    }
  };

  const setActivePlan = async (planId: string): Promise<void> => {
    try {
      const now = Timestamp.now().toDate();
      // First, deactivate all plans
      const inactiveUpdates = workoutPlans.map(plan =>
        updateDoc(doc(db, 'workoutPlans', plan.id), {
          isActive: false,
          updatedAt: Timestamp.fromDate(now)
        })
      );
      await Promise.all(inactiveUpdates);

      // Then activate the selected plan
      await updateDoc(doc(db, 'workoutPlans', planId), {
        isActive: true,
        updatedAt: Timestamp.fromDate(now)
      });

      setWorkoutPlans(prev =>
        prev.map(plan => ({
          ...plan,
          isActive: plan.id === planId,
          updatedAt: now
        }))
      );
      setError(null);
    } catch (err) {
      setError('Failed to set active plan');
      console.error('Error setting active plan:', err);
      throw err;
    }
  };

  const addWorkoutDay = async (planId: string, name: string): Promise<void> => {
    try {
      const plan = workoutPlans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const newDay: WorkoutDay = {
        id: crypto.randomUUID(),
        name,
        exercises: []
      };

      const now = Timestamp.now().toDate();
      const updatedDays = [...plan.days, newDay];
      const planRef = doc(db, 'workoutPlans', planId);
      
      await updateDoc(planRef, {
        days: updatedDays,
        updatedAt: Timestamp.fromDate(now)
      });

      setWorkoutPlans(prev =>
        prev.map(plan =>
          plan.id === planId ? { ...plan, days: updatedDays, updatedAt: now } : plan
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to add workout day');
      console.error('Error adding workout day:', err);
      throw err;
    }
  };

  const updateWorkoutDay = async (
    planId: string,
    dayId: string,
    updates: Partial<WorkoutDay>
  ): Promise<void> => {
    try {
      const plan = workoutPlans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const updatedDays = plan.days.map(day =>
        day.id === dayId ? { ...day, ...updates } : day
      );

      const now = Timestamp.now().toDate();
      const planRef = doc(db, 'workoutPlans', planId);
      await updateDoc(planRef, {
        days: updatedDays,
        updatedAt: Timestamp.fromDate(now)
      });

      setWorkoutPlans(prev =>
        prev.map(plan =>
          plan.id === planId ? { ...plan, days: updatedDays, updatedAt: now } : plan
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to update workout day');
      console.error('Error updating workout day:', err);
      throw err;
    }
  };

  const deleteWorkoutDay = async (planId: string, dayId: string): Promise<void> => {
    try {
      const plan = workoutPlans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const updatedDays = plan.days.filter(day => day.id !== dayId);
      const now = Timestamp.now().toDate();
      const planRef = doc(db, 'workoutPlans', planId);
      
      await updateDoc(planRef, {
        days: updatedDays,
        updatedAt: Timestamp.fromDate(now)
      });

      setWorkoutPlans(prev =>
        prev.map(plan =>
          plan.id === planId ? { ...plan, days: updatedDays, updatedAt: now } : plan
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to delete workout day');
      console.error('Error deleting workout day:', err);
      throw err;
    }
  };

  const addExercise = async (
    planId: string,
    dayId: string,
    exercise: Omit<Exercise, 'id'>
  ): Promise<void> => {
    try {
      const plan = workoutPlans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const newExercise: Exercise = {
        ...exercise,
        id: crypto.randomUUID()
      };

      const updatedDays = plan.days.map(day =>
        day.id === dayId
          ? { ...day, exercises: [...day.exercises, newExercise] }
          : day
      );

      const now = Timestamp.now().toDate();
      const planRef = doc(db, 'workoutPlans', planId);
      await updateDoc(planRef, {
        days: updatedDays,
        updatedAt: Timestamp.fromDate(now)
      });

      setWorkoutPlans(prev =>
        prev.map(plan =>
          plan.id === planId ? { ...plan, days: updatedDays, updatedAt: now } : plan
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to add exercise');
      console.error('Error adding exercise:', err);
      throw err;
    }
  };

  const updateExercise = async (
    planId: string,
    dayId: string,
    exercise: Exercise
  ): Promise<void> => {
    try {
      const plan = workoutPlans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const updatedDays = plan.days.map(day =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map(e =>
                e.id === exercise.id ? exercise : e
              )
            }
          : day
      );

      const now = Timestamp.now().toDate();
      const planRef = doc(db, 'workoutPlans', planId);
      await updateDoc(planRef, {
        days: updatedDays,
        updatedAt: Timestamp.fromDate(now)
      });

      setWorkoutPlans(prev =>
        prev.map(plan =>
          plan.id === planId ? { ...plan, days: updatedDays, updatedAt: now } : plan
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to update exercise');
      console.error('Error updating exercise:', err);
      throw err;
    }
  };

  const deleteExercise = async (
    planId: string,
    dayId: string,
    exerciseId: string
  ): Promise<void> => {
    try {
      const plan = workoutPlans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const updatedDays = plan.days.map(day =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.filter(e => e.id !== exerciseId)
            }
          : day
      );

      const now = Timestamp.now().toDate();
      const planRef = doc(db, 'workoutPlans', planId);
      await updateDoc(planRef, {
        days: updatedDays,
        updatedAt: Timestamp.fromDate(now)
      });

      setWorkoutPlans(prev =>
        prev.map(plan =>
          plan.id === planId ? { ...plan, days: updatedDays, updatedAt: now } : plan
        )
      );
      setError(null);
    } catch (err) {
      setError('Failed to delete exercise');
      console.error('Error deleting exercise:', err);
      throw err;
    }
  };

  return {
    workoutPlans,
    loading,
    error,
    createWorkoutPlan,
    updateWorkoutPlan,
    deleteWorkoutPlan,
    setActivePlan,
    addWorkoutDay,
    updateWorkoutDay,
    deleteWorkoutDay,
    addExercise,
    updateExercise,
    deleteExercise
  };
}; 