import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { WorkoutPlan, WorkoutDay, Exercise } from '../../types/workout';

const EditWorkoutPlan: React.FC = () => {
  const { traineeId } = useParams<{ traineeId: string }>();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    const fetchWorkoutPlan = async () => {
      if (!traineeId || !userData?.uid) {
        setError('חסרים פרטים נדרשים');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const workoutPlansRef = collection(db, 'workoutPlans');
        const q = query(
          workoutPlansRef,
          where('traineeId', '==', traineeId),
          where('isActive', '==', true)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          setError('לא נמצאה תוכנית אימון פעילה');
          setLoading(false);
          return;
        }

        // Sort plans by createdAt in memory
        const docs = querySnapshot.docs;
        docs.sort((a, b) => {
          const aTime = a.data().createdAt?.toMillis() || 0;
          const bTime = b.data().createdAt?.toMillis() || 0;
          return bTime - aTime; // Descending order - newest first
        });

        const planDoc = docs[0]; // Get the most recent plan
        const planData = planDoc.data();
        
        // Ensure all required fields are present with proper defaults
        setWorkoutPlan({
          id: planDoc.id,
          workoutPlanName: planData.workoutPlanName || planData.name || '',
          name: planData.name || '',
          traineeId: planData.traineeId,
          coachId: planData.coachId,
          isActive: planData.isActive,
          days: (planData.days || []).map((day: any) => ({
            id: day.id || crypto.randomUUID(),
            name: day.name || '',
            exercises: (day.exercises || []).map((exercise: any) => ({
              id: exercise.id || crypto.randomUUID(),
              name: exercise.name || '',
              sets: Number(exercise.sets) || 1,
              reps: String(exercise.reps ?? ''),
              weight: Number(exercise.weight) || 0,
              notes: exercise.notes || '',
              restTime: Number(exercise.restTime) || 60
            })),
            notes: day.notes || ''
          })),
          createdAt: planData.createdAt,
          updatedAt: planData.updatedAt,
          description: planData.description || ''
        });
      } catch (err) {
        console.error('Error fetching workout plan:', err);
        setError('שגיאה בטעינת תוכנית האימון');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutPlan();
  }, [traineeId, userData?.uid]);

  const handleAddDay = () => {
    if (!workoutPlan) return;

    const newDay: WorkoutDay = {
      id: crypto.randomUUID(),
      name: 'יום אימון חדש',
      exercises: [],
      notes: ''
    };

    setWorkoutPlan({
      ...workoutPlan,
      days: [...workoutPlan.days, newDay]
    });
  };

  const handleDeleteDay = (dayId: string) => {
    if (!workoutPlan) return;

    setWorkoutPlan({
      ...workoutPlan,
      days: workoutPlan.days.filter(day => day.id !== dayId)
    });
  };

  const handleAddExercise = (dayId: string) => {
    if (!workoutPlan) return;

    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      name: 'תרגיל חדש',
    sets: 3,
    reps: '8-10',
    weight: 0,
    notes: '',
      restTime: 60
    };

    setWorkoutPlan({
      ...workoutPlan,
      days: workoutPlan.days.map(day => {
        if (day.id === dayId) {
          return {
            ...day,
            exercises: [...day.exercises, newExercise]
          };
        }
        return day;
      })
    });
  };

  const handleDeleteExercise = (dayId: string, exerciseId: string) => {
    if (!workoutPlan) return;

    setWorkoutPlan({
      ...workoutPlan,
      days: workoutPlan.days.map(day => {
        if (day.id === dayId) {
          return {
            ...day,
            exercises: day.exercises.filter(ex => ex.id !== exerciseId)
          };
        }
        return day;
      })
    });
  };

  const validateWorkoutPlan = (plan: WorkoutPlan): boolean => {
    if (!plan.workoutPlanName?.trim()) {
      setError('נדרש שם לתוכנית האימון');
      return false;
    }

    if (!plan.days.length) {
      setError('נדרש לפחות יום אימון אחד');
      return false;
    }

    // Validate reps format
    const validateReps = (reps: string | number) => {
      if (typeof reps === 'number') return true;
      if (typeof reps === 'string') {
        // Allow pure numbers
        if (/^\d+$/.test(reps)) return true;
        // Allow ranges like "8-10"
        if (/^\d+\s*-\s*\d+$/.test(reps)) {
          const [min, max] = reps.split('-').map(n => parseInt(n.trim()));
          return min <= max;
        }
      }
      return false;
    };

    for (const day of plan.days) {
      if (!day.name.trim()) {
        setError('נדרש שם לכל יום אימון');
        return false;
      }

      if (!day.exercises.length) {
        setError('נדרש לפחות תרגיל אחד בכל יום אימון');
        return false;
      }

      for (const exercise of day.exercises) {
        if (!exercise.name.trim()) {
          setError('נדרש שם לכל תרגיל');
          return false;
        }

        if (exercise.sets < 1) {
          setError('מספר הסטים חייב להיות גדול מ-0');
          return false;
        }

        if (!validateReps(exercise.reps)) {
          setError('אנא הזן מספר או טווח חזרות תקין (למשל: 8-10)');
          return false;
        }
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (!workoutPlan || !workoutPlan.id) {
      setError('לא נמצאה תוכנית אימון לעדכון');
      return;
    }

    if (!validateWorkoutPlan(workoutPlan)) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const planRef = doc(db, 'workoutPlans', workoutPlan.id);
      
      // Create a clean update object without undefined values
      const updates: Partial<WorkoutPlan> = {
        workoutPlanName: workoutPlan.workoutPlanName,
        name: workoutPlan.name,
        days: workoutPlan.days.map(day => ({
          id: day.id,
          name: day.name.trim(),
          exercises: day.exercises.map(exercise => ({
            id: exercise.id,
            name: exercise.name.trim(),
            sets: Number(exercise.sets) || 1,
            reps: exercise.reps,
            weight: Number(exercise.weight) || 0,
            notes: exercise.notes?.trim() || '',
            restTime: Number(exercise.restTime) || 60
          })),
          notes: day.notes?.trim() || ''
        })),
        updatedAt: Timestamp.now()
      };

      await updateDoc(planRef, updates);
      navigate('/coach/dashboard');
    } catch (err) {
      console.error('Error updating workout plan:', err);
      setError('שגיאה בעדכון תוכנית האימון');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error || !workoutPlan) {
    return (
      <Layout>
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
          <div className="text-center text-red-500 mb-4">{error || 'לא נמצאה תוכנית אימון'}</div>
          <button
            onClick={() => navigate('/coach/dashboard')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center transition-colors"
          >
            <span className="mr-2">←</span>
            חזור
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold">עריכת תוכנית אימון</h1>
          <button
            onClick={() => navigate('/coach/dashboard')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center transition-colors"
          >
            <span className="mr-2">←</span>
            חזור
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">שם תוכנית האימון</label>
            <input
              type="text"
              value={workoutPlan.workoutPlanName}
              onChange={(e) => setWorkoutPlan({ ...workoutPlan, workoutPlanName: e.target.value })}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="הכנס שם לתוכנית האימון"
            />
          </div>

          {workoutPlan.days.map((day, dayIndex) => (
            <div key={day.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <input
                  type="text"
                  value={day.name}
                  onChange={(e) => {
                    const updatedDays = [...workoutPlan.days];
                    updatedDays[dayIndex] = { ...day, name: e.target.value };
                    setWorkoutPlan({ ...workoutPlan, days: updatedDays });
                  }}
                  className="text-lg font-medium p-2 border rounded flex-1 ml-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="שם יום האימון"
                />
                <button
                  onClick={() => handleDeleteDay(day.id)}
                  className="text-red-500 hover:text-red-600 text-sm px-3 py-1 rounded transition-colors"
                >
                  מחק יום
                </button>
              </div>

              <div className="space-y-4">
                {day.exercises.map((exercise, exerciseIndex) => (
                  <div key={exercise.id} className="bg-gray-50 p-4 rounded space-y-3">
                    <div className="flex justify-between items-center gap-2">
                      <input
                        type="text"
                        value={exercise.name}
                        onChange={(e) => {
                          const updatedDays = [...workoutPlan.days];
                          updatedDays[dayIndex].exercises[exerciseIndex].name = e.target.value;
                          setWorkoutPlan({ ...workoutPlan, days: updatedDays });
                        }}
                        className="font-medium p-2 border rounded flex-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="שם התרגיל"
                      />
                      <button
                        onClick={() => handleDeleteExercise(day.id, exercise.id)}
                        className="text-red-500 hover:text-red-600 text-sm px-3 py-1 rounded transition-colors"
                      >
                        מחק תרגיל
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">סטים</label>
                        <input
                          type="number"
                          min="1"
                          value={exercise.sets}
                          onChange={(e) => {
                            const updatedDays = [...workoutPlan.days];
                            updatedDays[dayIndex].exercises[exerciseIndex].sets = parseInt(e.target.value) || 1;
                            setWorkoutPlan({ ...workoutPlan, days: updatedDays });
                          }}
                          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">חזרות</label>
                        <input
                          type="text"
                          value={exercise.reps}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (/^[\d\s-]*$/.test(value)) {
                              const updatedDays = [...workoutPlan.days];
                              updatedDays[dayIndex].exercises[exerciseIndex].reps = value;
                              setWorkoutPlan({ ...workoutPlan, days: updatedDays });
                            }
                          }}
                          placeholder="לדוגמה: 8-10 או 12"
                          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">משקל (ק"ג)</label>
                        <input
                          type="number"
                          min="0"
                          value={exercise.weight}
                          onChange={(e) => {
                            const updatedDays = [...workoutPlan.days];
                            updatedDays[dayIndex].exercises[exerciseIndex].weight = parseInt(e.target.value) || 0;
                            setWorkoutPlan({ ...workoutPlan, days: updatedDays });
                          }}
                          className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">הערות</label>
                      <textarea
                        value={exercise.notes || ''}
                        onChange={(e) => {
                          const updatedDays = [...workoutPlan.days];
                          updatedDays[dayIndex].exercises[exerciseIndex].notes = e.target.value;
                          setWorkoutPlan({ ...workoutPlan, days: updatedDays });
                        }}
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={2}
                        placeholder="הוסף הערות לתרגיל"
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => handleAddExercise(day.id)}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold py-2 px-4 rounded transition-colors"
                >
                  הוסף תרגיל
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={handleAddDay}
            className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold py-2 px-4 rounded transition-colors"
          >
            הוסף יום אימון
          </button>

          <div className="mt-8 flex flex-col gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
            <button
              onClick={() => navigate('/coach/dashboard')}
              className="w-full px-4 py-2 bg-gray-100 text-gray-800 font-semibold rounded-md hover:bg-gray-200 border border-gray-300 transition-colors"
              disabled={saving}
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EditWorkoutPlan; 