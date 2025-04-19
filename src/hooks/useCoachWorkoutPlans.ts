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
  orderBy,
  Timestamp,
  getDoc,
  serverTimestamp,
  DocumentReference
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { WorkoutPlan, WorkoutDay, Exercise } from '../types/workout';
import { useAuth } from '../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

interface UseCoachWorkoutPlansReturn {
  workoutPlans: WorkoutPlan[];
  loading: boolean;
  error: string | null;
  createWorkoutPlan: (plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'>) => Promise<WorkoutPlan>;
  updateWorkoutPlan: (planId: string, updates: Partial<Omit<WorkoutPlan, 'id'>>) => Promise<void>;
  deleteWorkoutPlan: (planId: string) => Promise<void>;
  setActivePlan: (planId: string) => Promise<void>;
  addWorkoutDay: (workoutPlanId: string, name: string) => Promise<WorkoutDay>;
  updateWorkoutDay: (planId: string, dayId: string, updates: Partial<Omit<WorkoutDay, 'id'>>) => Promise<void>;
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
    if (!userData?.uid) return;

    const fetchWorkoutPlans = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'workoutPlans'),
          where('coachId', '==', userData.uid),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const plans: WorkoutPlan[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Processing workout plan:', {
            planId: doc.id,
            traineeId: data.traineeId,
            daysCount: data.days?.length
          });
          
          plans.push({
            id: doc.id,
            workoutPlanName: data.workoutPlanName,
            description: data.description || '',
            days: (data.days || []).map((day: any): WorkoutDay => {
              console.log('Processing day:', {
                dayId: day.id,
                dayName: day.name,
                exerciseCount: day.exercises?.length
              });
              
              return {
                id: day.id || uuidv4(),
                name: day.name,
                exercises: day.exercises.map((exercise: any): Exercise => {
                  console.log('Processing exercise:', {
                    exerciseId: exercise.id,
                    name: exercise.name,
                    weight: exercise.weight,
                    actualWeight: exercise.actualWeight,
                    hasHistory: exercise.weightHistory?.length > 0
                  });
                  
                  return {
                    id: exercise.id || uuidv4(),
                    name: exercise.name,
                    sets: exercise.sets,
                    reps: exercise.reps,
                    weight: exercise.weight,
                    actualWeight: exercise.actualWeight,
                    actualReps: exercise.actualReps,
                    notes: exercise.notes,
                    restTime: exercise.restTime,
                    lastCompleted: exercise.lastCompleted,
                    weightHistory: exercise.weightHistory?.map((history: any) => ({
                      weight: history.weight,
                      timestamp: history.timestamp,
                      notes: history.notes
                    })) || []
                  };
                }),
                notes: day.notes || '',
                lastCompleted: day.lastCompleted
              };
            }),
            isActive: data.isActive || false,
            traineeId: data.traineeId || '',
            coachId: data.coachId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            lastWorkoutDate: data.lastWorkoutDate
          });
        });

        setWorkoutPlans(plans);
        setError(null);
      } catch (err) {
        console.error('Error fetching workout plans:', err);
        setError('שגיאה בטעינת תוכניות האימון');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutPlans();
  }, [userData?.uid]);

  const createWorkoutPlan = async (plan: Omit<WorkoutPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkoutPlan> => {
    try {
      setLoading(true);
      const newPlanRef = doc(collection(db, 'workoutPlans'));
      const now = Timestamp.now();
      
      const newPlan: WorkoutPlan = {
        ...plan,
        id: newPlanRef.id,
        createdAt: now,
        updatedAt: now
      };

      await setDoc(newPlanRef, {
        ...newPlan,
        createdAt: now,
        updatedAt: now
      });

      setWorkoutPlans(prev => [newPlan, ...prev]);
      setError(null);
      return newPlan;
    } catch (err) {
      console.error('Error creating workout plan:', err);
      setError('שגיאה ביצירת תוכנית אימון');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateWorkoutPlan = async (planId: string, updates: Partial<Omit<WorkoutPlan, 'id'>>): Promise<void> => {
    try {
      setLoading(true);
      const planRef = doc(db, 'workoutPlans', planId) as DocumentReference<WorkoutPlan>;
      const now = Timestamp.now();
      
      await updateDoc(planRef, {
        ...updates,
        updatedAt: now
      });

      setWorkoutPlans(prev => prev.map(plan => 
        plan.id === planId 
          ? { ...plan, ...updates, updatedAt: now }
          : plan
      ));
      setError(null);
    } catch (err) {
      console.error('Error updating workout plan:', err);
      setError('שגיאה בעדכון תוכנית אימון');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteWorkoutPlan = async (planId: string): Promise<void> => {
    try {
      setLoading(true);
      await deleteDoc(doc(db, 'workoutPlans', planId));
      setWorkoutPlans(prev => prev.filter(plan => plan.id !== planId));
      setError(null);
    } catch (err) {
      console.error('Error deleting workout plan:', err);
      setError('שגיאה במחיקת תוכנית אימון');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const setActivePlan = async (planId: string): Promise<void> => {
    try {
      const now = Timestamp.now();
      // First, deactivate all plans
      const inactiveUpdates = workoutPlans.map(plan =>
        updateDoc(doc(db, 'workoutPlans', plan.id!) as DocumentReference<WorkoutPlan>, {
          isActive: false,
          updatedAt: now
        })
      );
      await Promise.all(inactiveUpdates);

      // Then activate the selected plan
      await updateDoc(doc(db, 'workoutPlans', planId) as DocumentReference<WorkoutPlan>, {
        isActive: true,
        updatedAt: now
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
      throw err;
    }
  };

  const addWorkoutDay = async (workoutPlanId: string, name: string): Promise<WorkoutDay> => {
    try {
      const newDay: WorkoutDay = {
        id: uuidv4(),
        name,
        exercises: [],
        notes: ''
      };

      const workoutPlanRef = doc(db, 'workoutPlans', workoutPlanId) as DocumentReference<WorkoutPlan>;
      const workoutPlanDoc = await getDoc(workoutPlanRef);

      if (!workoutPlanDoc.exists()) {
        throw new Error('Workout plan not found');
      }

      const workoutPlan = workoutPlanDoc.data() as WorkoutPlan;
      const updatedDays = [...(workoutPlan.days || []), newDay];

      await updateDoc(workoutPlanRef, {
        days: updatedDays,
        updatedAt: serverTimestamp()
      });

      setWorkoutPlans(prevPlans =>
        prevPlans.map(plan =>
          plan.id === workoutPlanId
            ? { ...plan, days: updatedDays }
            : plan
        )
      );

      return newDay;
    } catch (error) {
      console.error('Error adding workout day:', error);
      throw error;
    }
  };

  const updateWorkoutDay = async (
    planId: string,
    dayId: string,
    updates: Partial<Omit<WorkoutDay, 'id'>>
  ): Promise<void> => {
    try {
      const plan = workoutPlans.find(p => p.id === planId);
      if (!plan) throw new Error('Plan not found');

      const updatedDays = plan.days.map(day =>
        day.id === dayId ? { ...day, ...updates } : day
      );

      const now = Timestamp.now();
      const planRef = doc(db, 'workoutPlans', planId) as DocumentReference<WorkoutPlan>;
      await updateDoc(planRef, {
        days: updatedDays,
        updatedAt: now
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
      const now = Timestamp.now();
      const planRef = doc(db, 'workoutPlans', planId) as DocumentReference<WorkoutPlan>;
      
      await updateDoc(planRef, {
        days: updatedDays,
        updatedAt: now
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
        id: uuidv4()
      };

      const updatedDays = plan.days.map(day =>
        day.id === dayId
          ? { ...day, exercises: [...day.exercises, newExercise] }
          : day
      );

      const now = Timestamp.now();
      const planRef = doc(db, 'workoutPlans', planId) as DocumentReference<WorkoutPlan>;
      await updateDoc(planRef, {
        days: updatedDays,
        updatedAt: now
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

      const now = Timestamp.now();
      const planRef = doc(db, 'workoutPlans', planId) as DocumentReference<WorkoutPlan>;
      await updateDoc(planRef, {
        days: updatedDays,
        updatedAt: now
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

      const now = Timestamp.now();
      const planRef = doc(db, 'workoutPlans', planId) as DocumentReference<WorkoutPlan>;
      await updateDoc(planRef, {
        days: updatedDays,
        updatedAt: now
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