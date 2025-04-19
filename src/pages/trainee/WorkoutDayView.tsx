import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { WorkoutDay, Exercise, WorkoutPlan, WeightHistory } from '../../types/workout';

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
        if (!day) {
          console.error(`Day ${dayId} not found in workout plan ${planDoc.id}. Available days:`, planData.days.map(d => d.id));
          setError('יום האימון המבוקש לא נמצא בתוכנית');
          return;
        }

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
        const initialStatuses = day.exercises.map(exercise => {
          const status = {
            exerciseId: exercise.id,
            completed: false,
            actualWeight: exercise.actualWeight ?? exercise.weight,
            actualReps: exercise.actualReps ?? exercise.reps,
            notes: exercise.notes || ''
          };
          
          console.log('Initializing exercise status:', {
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            plannedWeight: exercise.weight,
            actualWeight: status.actualWeight
          });
          
          return status;
        });
        
        setExerciseStatuses(initialStatuses);
        setError(null);
      } catch (err) {
        console.error('Error fetching workout day:', err);
        setError('שגיאה בטעינת יום האימון');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutDay();
  }, [dayId, userData?.uid]);

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

  const handleSave = async () => {
    try {
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

      const planRef = doc(db, 'workoutPlans', workoutPlanId);
      const planDoc = await getDoc(planRef);
      
      if (!planDoc.exists()) {
        console.error('Workout plan not found:', workoutPlanId);
        setError('תוכנית האימון לא נמצאה');
        return;
      }

      const planData = planDoc.data() as WorkoutPlan;
      const now = Timestamp.now();

      // Update the exercises with new values while preserving the original structure
      const updatedDays = planData.days.map(day => {
        if (day.id === dayId) {
          console.log('Updating day:', {
            dayId: day.id,
            dayName: day.name,
            exerciseCount: day.exercises.length
          });

          return {
            ...day,
            lastCompleted: now,
            exercises: day.exercises.map(exercise => {
              const status = exerciseStatuses.find(s => s.exerciseId === exercise.id);
              if (!status) {
                console.log('No status found for exercise:', exercise.id);
                return exercise;
              }

              // Only update if there's a change in weight
              const newActualWeight = status.actualWeight !== undefined ? status.actualWeight : exercise.weight;
              const weightChanged = newActualWeight !== exercise.actualWeight;

              console.log('Updating exercise:', {
                exerciseId: exercise.id,
                exerciseName: exercise.name,
                originalWeight: exercise.weight,
                previousActualWeight: exercise.actualWeight,
                newActualWeight,
                weightChanged
              });

              // Only create weight history entry if weight actually changed
              let weightHistory = exercise.weightHistory || [];
              if (weightChanged) {
                const historyEntry: WeightHistory = {
                  weight: newActualWeight,
                  timestamp: now,
                  notes: status.notes
                };
                weightHistory = [...weightHistory, historyEntry];

                console.log('Adding weight history entry:', historyEntry);
              }

              const updatedExercise = {
                ...exercise,
                actualWeight: newActualWeight,
                actualReps: status.actualReps ?? exercise.reps,
                notes: status.notes || exercise.notes,
                lastCompleted: now,
                weightHistory
              };

              console.log('Final exercise update:', {
                exerciseId: updatedExercise.id,
                exerciseName: updatedExercise.name,
                plannedWeight: updatedExercise.weight,
                actualWeight: updatedExercise.actualWeight,
                hasHistory: updatedExercise.weightHistory?.length > 0
              });

              return updatedExercise;
            })
          };
        }
        return day;
      });

      const updateData = {
        days: updatedDays,
        lastWorkoutDate: now,
        updatedAt: now
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
      await updateDoc(planRef, updateData);

      console.log('Successfully saved workout progress');
      navigate(-1); // Go back to previous page
    } catch (err) {
      console.error('Error saving workout progress:', err);
      setError('שגיאה בשמירת ההתקדמות');
    }
  };

  if (loading) return <div className="p-4">טוען...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!workoutDay) return <div className="p-4">יום האימון לא נמצא</div>;

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