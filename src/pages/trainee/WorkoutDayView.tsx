import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { WorkoutDay, Exercise, WorkoutPlan, WeightHistory } from '../../types/workout';
import { WeightHistoryChart } from '../../components/workout/WeightHistoryChart';
import { Layout } from '../../components/layout/Layout';

interface ExerciseStatus {
  exerciseId: string;
  completed: boolean;
  actualWeight?: number;
  actualReps?: number;
  notes?: string;
}

export const WorkoutDayView: React.FC = () => {
  const { dayId } = useParams<{ dayId: string }>();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workoutDay, setWorkoutDay] = useState<WorkoutDay | null>(null);
  const [exerciseStatuses, setExerciseStatuses] = useState<ExerciseStatus[]>([]);
  const [workoutPlanId, setWorkoutPlanId] = useState<string | null>(null);
  const [visibleChartId, setVisibleChartId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchWorkoutDay = async () => {
      try {
        if (!dayId || !userData?.uid) return;
        
        // First, find the active workout plan for the trainee
        const plansQuery = query(
          collection(db, 'workoutPlans'),
          where('traineeId', '==', userData.uid),
          where('isActive', '==', true)
        );

        const plansSnapshot = await getDocs(plansQuery);
        if (plansSnapshot.empty) {
          console.error('No active workout plan found for trainee:', userData.uid);
          setError('לא נמצאה תוכנית אימון פעילה');
          return;
        }

        const planDoc = plansSnapshot.docs[0];
        setWorkoutPlanId(planDoc.id);
        const planData = planDoc.data() as WorkoutPlan;

        // Find the specific day in the workout plan
        const day = planData.days.find(d => d.id === dayId);
        
        // If the requested day is not found, but there are other days available
        if (!day && planData.days.length > 0) {
          console.log('Day not found, redirecting to first available day:', {
            requestedDayId: dayId,
            availableDays: planData.days.map(d => d.id),
            redirectingTo: planData.days[0].id
          });
          navigate(`/trainee/workout/${planData.days[0].id}`, { replace: true });
          return;
        }
        
        // If no days exist at all
        if (!day && planData.days.length === 0) {
          console.error('No workout days found in plan:', planDoc.id);
          setError('לא נמצאו ימי אימון בתוכנית. אנא פנה למאמן ליצירת תוכנית חדשה');
          setLoading(false);
          return;
        }

        // If the day exists, proceed as normal
        if (day) {
          console.log('Found workout day:', {
            dayId: day.id,
            dayName: day.name,
            exercises: day.exercises.map(e => ({
              id: e.id,
              name: e.name,
              plannedWeight: e.weight,
              actualWeight: e.actualWeight
            }))
          });

          setWorkoutDay(day);
          
          // Initialize exercise statuses with actual values from the workout plan
          const initialStatuses = day.exercises.map(exercise => ({
            exerciseId: exercise.id,
            completed: exercise.completed || false,
            actualWeight: exercise.actualWeight ?? exercise.weight,
            actualReps: Number(exercise.actualReps ?? exercise.reps),
            notes: exercise.notes || ''
          }));
          
          setExerciseStatuses(initialStatuses);
          setError(null);
        }
      } catch (err) {
        console.error('Error fetching workout day:', err);
        setError('שגיאה בטעינת יום האימון');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutDay();
  }, [dayId, userData?.uid, navigate]);

  const handleExerciseStatusChange = (exerciseId: string, updates: Partial<ExerciseStatus>) => {
    console.log('Updating exercise status:', {
      exerciseId,
      updates
    });
    
    setExerciseStatuses(prevStatuses => 
      prevStatuses.map(status => {
        if (status.exerciseId === exerciseId) {
          const updatedStatus = { ...status, ...updates };
          console.log('Updated status:', updatedStatus);
          return updatedStatus;
        }
        return status;
      })
    );
  };

  const toggleChartVisibility = (exerciseId: string) => {
    setVisibleChartId(visibleChartId === exerciseId ? null : exerciseId);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      if (!dayId || !workoutDay || !userData?.uid || !workoutPlanId) {
        console.error('Missing required data for save:', { dayId, workoutPlanId, userId: userData?.uid });
        setError('חסרים נתונים נדרשים לשמירה');
        return;
      }

      console.log('Starting save with data:', {
        workoutPlanId,
        dayId,
        exerciseStatuses: exerciseStatuses.map(status => ({
          exerciseId: status.exerciseId,
          actualWeight: status.actualWeight,
          completed: status.completed
        }))
      });

      const workoutPlanRef = doc(db, 'workoutPlans', workoutPlanId);
      const workoutPlanDoc = await getDoc(workoutPlanRef);
      
      if (!workoutPlanDoc.exists()) {
        console.error('Workout plan not found:', workoutPlanId);
        setError('תוכנית האימון לא נמצאה');
        return;
      }

      const workoutPlan = workoutPlanDoc.data() as WorkoutPlan;
      const updatedDays = workoutPlan.days.map(day => {
        if (day.id === dayId) {
          console.log('Updating day:', {
            dayId: day.id,
            dayName: day.name,
            exerciseCount: day.exercises.length
          });

          return {
            ...day,
            exercises: day.exercises.map(exercise => {
              const status = exerciseStatuses.find(s => s.exerciseId === exercise.id);
              if (!status) {
                console.log('No status found for exercise:', exercise.id);
                return exercise;
              }

              const newWeightHistory = status.actualWeight && status.actualWeight > 0
                ? [{
                    weight: status.actualWeight,
                    timestamp: Timestamp.now(),
                    notes: status.notes || ''
                  }, ...(exercise.weightHistory || [])]
                : exercise.weightHistory || [];

              // Check if this is a new personal record
              const currentPR = exercise.personalRecord || 0;
              const newPR = status.actualWeight && status.actualWeight > currentPR
                ? status.actualWeight
                : currentPR;

              const updatedExercise = {
                ...exercise,
                actualWeight: status.actualWeight,
                actualReps: status.actualReps ?? exercise.reps,
                notes: status.notes || exercise.notes,
                completed: status.completed,
                completedAt: status.completed ? Timestamp.now() : null,
                weightHistory: newWeightHistory,
                personalRecord: newPR
              };

              console.log('Final exercise update:', {
                exerciseId: updatedExercise.id,
                exerciseName: updatedExercise.name,
                plannedWeight: updatedExercise.weight,
                actualWeight: updatedExercise.actualWeight,
                hasHistory: updatedExercise.weightHistory?.length > 0,
                completed: updatedExercise.completed,
                completedAt: updatedExercise.completedAt
              });

              return updatedExercise;
            })
          };
        }
        return day;
      });

      const updateData = {
        days: updatedDays,
        updatedAt: Timestamp.now()
      };

      console.log('Saving to Firestore:', {
        path: `workoutPlans/${workoutPlanId}`,
        updateData: {
          daysCount: updateData.days.length,
          exercisesWithActualWeight: updateData.days
            .flatMap(d => d.exercises)
            .filter(e => e.actualWeight !== undefined).length,
          exercises: updateData.days
            .flatMap(d => d.exercises)
            .map(e => ({
              id: e.id,
              name: e.name,
              plannedWeight: e.weight,
              actualWeight: e.actualWeight
            }))
        }
      });

      // Update the workout plan with the new data
      await updateDoc(workoutPlanRef, updateData);

      console.log('Successfully saved workout progress');
      navigate(-1); // Go back to previous page
    } catch (err) {
      console.error('Error saving workout progress:', err);
      setError('שגיאה בשמירת ההתקדמות');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error || !workoutDay) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-center text-red-500 mb-4">{error || 'לא נמצא יום אימון'}</div>
          <button
            onClick={() => navigate('/trainee/dashboard')}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
          >
            חזור לתוכנית האימון
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{workoutDay.name}</h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          חזור
        </button>
      </div>

      <div className="space-y-6">
        {workoutDay.exercises.map((exercise, index) => {
          const status = exerciseStatuses.find(s => s.exerciseId === exercise.id);
          if (!status) return null;

          return (
            <div key={exercise.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">{exercise.name}</h3>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={status.completed}
                    onChange={(e) => handleExerciseStatusChange(exercise.id, { completed: e.target.checked })}
                    className="h-5 w-5 text-blue-600"
                  />
                  <span className="mr-2">הושלם</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">משקל מתוכנן</label>
                  <p className="mt-1">{exercise.weight} ק"ג</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">משקל בפועל</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={status.actualWeight || ''}
                      onChange={(e) => {
                        const newWeight = e.target.value ? Number(e.target.value) : undefined;
                        console.log('Updating actual weight:', {
                          exerciseId: exercise.id,
                          exerciseName: exercise.name,
                          newWeight
                        });
                        handleExerciseStatusChange(exercise.id, { actualWeight: newWeight });
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    {exercise.weightHistory && exercise.weightHistory.length > 0 && (
                      <button
                        onClick={() => toggleChartVisibility(exercise.id)}
                        className="mr-2 p-2 text-blue-600 hover:text-blue-800"
                        title="היסטוריה"
                      >
                        📈
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">חזרות מתוכננות</label>
                  <p className="mt-1">{exercise.reps}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">חזרות בפועל</label>
                  <input
                    type="number"
                    value={status.actualReps || ''}
                    onChange={(e) => {
                      const newReps = e.target.value ? Number(e.target.value) : undefined;
                      handleExerciseStatusChange(exercise.id, { actualReps: newReps });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">הערות</label>
                <textarea
                  value={status.notes || ''}
                  onChange={(e) => handleExerciseStatusChange(exercise.id, { notes: e.target.value })}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Weight History Chart */}
              {exercise.weightHistory && (
                <WeightHistoryChart 
                  history={exercise.weightHistory} 
                  isVisible={visibleChartId === exercise.id} 
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          שמור התקדמות
        </button>
      </div>
    </div>
  );
}; 