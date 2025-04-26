import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useCoachWorkoutPlans } from '../../hooks/useCoachWorkoutPlans';
import { WorkoutPlan, WorkoutDay, Exercise } from '../../types/workout';
import { doc, collection, setDoc, Timestamp, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';

// Validation helpers
const safeString = (input: any): string => typeof input === 'string' ? input : '';
const safeNumber = (input: any): number => {
  const num = Number(input);
  return isNaN(num) ? 0 : num;
};

const CreateWorkoutPlan: React.FC = () => {
  const { traineeId } = useParams<{ traineeId: string }>();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [currentDay, setCurrentDay] = useState<WorkoutDay>({
    id: crypto.randomUUID(),
    name: '',
    exercises: []
  });
  const [currentExercise, setCurrentExercise] = useState<Exercise>({
    id: crypto.randomUUID(),
    name: '',
    sets: 3,
    reps: '10',
    weight: 0,
    notes: '',
    restTime: 60
  });
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [existingPlan, setExistingPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    const checkExistingPlan = async () => {
      if (!traineeId) return;
      
      const plansRef = collection(db, 'workoutPlans');
      const q = query(plansRef, where('traineeId', '==', traineeId), where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const plan = querySnapshot.docs[0].data() as WorkoutPlan;
        setExistingPlan(plan);
      }
    };

    checkExistingPlan();
  }, [traineeId]);

  const handleAddDay = () => {
    if (!currentDay.name.trim()) {
      setError('נא להזין שם ליום האימון');
      return;
    }

    setDays([...days, { ...currentDay, exercises: [] }]);
    setCurrentDay({
      id: crypto.randomUUID(),
      name: '',
      exercises: []
    });
    setError(null);
  };

  const handleAddExercise = (dayId: string) => {
    if (!currentExercise.name?.trim()) {
      setError('נא להזין שם לתרגיל');
      return;
    }

    setDays(days.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          exercises: [...(day.exercises || []), { 
            ...currentExercise, 
            id: crypto.randomUUID(),
            name: currentExercise.name.trim() 
          }]
        };
      }
      return day;
    }));

    setCurrentExercise({
      id: crypto.randomUUID(),
      name: '',
      sets: 3,
      reps: '10',
      weight: 0,
      notes: '',
      restTime: 60
    });
    setError(null);
  };

  const handleDeleteDay = (dayId: string) => {
    setDays(days.filter(day => day.id !== dayId));
  };

  const handleDeleteExercise = (dayId: string, exerciseId: string) => {
    setDays(days.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          exercises: day.exercises.filter(ex => ex.id !== exerciseId)
        };
      }
      return day;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

    try {
      if (!planName.trim()) {
        setError('נא להזין שם תוכנית');
        return;
      }

      if (days.length === 0) {
        setError('נא להוסיף לפחות אימון אחד');
        return;
      }

      // Validate exercises
      const hasInvalidExercises = days.some(day => 
        !day.exercises?.some(exercise => 
          exercise && typeof exercise.name === 'string' && exercise.name.trim() !== ''
        )
      );
      
      if (hasInvalidExercises) {
        setError('נא לוודא שכל ימי האימון מכילים לפחות תרגיל אחד תקין');
        return;
      }

      // Validate reps format for all exercises
      const hasInvalidReps = days.some(day =>
        day.exercises?.some(exercise => !validateReps(exercise.reps))
      );

      if (hasInvalidReps) {
        setError('אנא הזן מספר או טווח חזרות תקין (למשל: 8-10)');
        return;
      }

      if (!userData?.uid) {
        setError('לא נמצא משתמש מחובר');
        return;
      }

      if (!traineeId) {
        setError('לא נמצא מתאמן');
        return;
      }

      if (existingPlan) {
        setShowConfirmation(true);
        return;
      }

      await savePlan();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError('אירעה שגיאה בשמירת תוכנית האימון');
    }
  };

  const savePlan = async () => {
    setSaving(true);
    setError(null);
    let savedPlanId = null;

    try {
      // Clean and validate the days array
      const validDays = days
        .filter(day => day && typeof day === 'object')
        .map(day => ({
          ...day,
          exercises: (day.exercises || [])
            .filter(exercise => 
              exercise && 
              typeof exercise === 'object' && 
              typeof exercise.name === 'string' && 
              exercise.name.trim() !== ''
            )
            .map(exercise => ({
              id: exercise.id || crypto.randomUUID(),
              name: exercise.name.trim(),
              sets: safeNumber(exercise.sets),
              reps: String(exercise.reps || '0'),
              weight: safeNumber(exercise.weight),
              notes: exercise.notes?.trim() || '',
              restTime: safeNumber(exercise.restTime)
            }))
        }))
        .filter(day => day.exercises.length > 0);

      if (validDays.length === 0) {
        setError('נא להוסיף לפחות יום אימון אחד עם תרגילים');
        setSaving(false);
        setShowConfirmation(false);
        return;
      }

      // Validate trainee exists
      if (!traineeId) {
        throw new Error('לא נמצא מתאמן');
      }

      // If there's an existing plan, deactivate it first
      if (existingPlan?.id) {
        const existingPlanRef = doc(db, 'workoutPlans', existingPlan.id);
        await setDoc(existingPlanRef, { isActive: false }, { merge: true });
      }

      // Create new plan with validated data
      const plansRef = collection(db, 'workoutPlans');
      const newPlanRef = doc(plansRef);
      const newPlan: WorkoutPlan = {
        id: newPlanRef.id,
        workoutPlanName: planName.trim(),
        name: planName.trim(), // Keep both for backward compatibility
        description: planDescription.trim(),
        days: validDays,
        traineeId: traineeId,
        coachId: userData?.uid || '',
        createdAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
        isActive: true
      };

      await setDoc(newPlanRef, newPlan);
      savedPlanId = newPlanRef.id;

      // Verify the plan was saved before navigating
      const savedPlanDoc = await getDoc(newPlanRef);
      if (!savedPlanDoc.exists()) {
        throw new Error('שגיאה בשמירת תוכנית האימון');
      }

      // Double check trainee still exists
      const traineeRef = doc(db, 'users', traineeId);
      const traineeDoc = await getDoc(traineeRef);
      if (!traineeDoc.exists()) {
        throw new Error('המתאמן לא נמצא במערכת');
      }

      // All checks passed, safe to navigate
      navigate(`/coach/trainee/${traineeId}/workout`);
    } catch (error) {
      console.error('Error saving workout plan:', error);
      
      // If we saved the plan but navigation failed, provide a manual link
      if (savedPlanId) {
        setError(
          `תוכנית האימון נשמרה בהצלחה, אך הייתה בעיה בניווט. ` +
          `אנא לחץ כאן כדי לצפות בתוכנית: ` +
          `<a href="/coach/trainee/${traineeId}/workout" class="text-blue-600 hover:text-blue-800 underline">צפה בתוכנית</a>`
        );
      } else {
        setError(error instanceof Error ? error.message : 'שגיאה בשמירת תוכנית האימון');
      }

      // Stay on the current page
      setSaving(false);
      setShowConfirmation(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">יצירת תוכנית אימון חדשה</h1>
          <button
            onClick={() => navigate(-1)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center"
          >
            <span className="mr-2">←</span>
            חזור
          </button>
        </div>

        {error && (
          <div 
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
            dangerouslySetInnerHTML={{ __html: error }}
          />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Plan Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שם התוכנית
            </label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="הכנס שם לתוכנית האימון"
            />
          </div>

          {/* Plan Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              תיאור התוכנית
            </label>
            <textarea
              value={planDescription}
              onChange={(e) => setPlanDescription(e.target.value)}
              className="w-full p-2 border rounded"
              rows={3}
              placeholder="הכנס תיאור לתוכנית האימון"
            />
          </div>

          {/* Days List */}
          <div className="space-y-4">
            {days.map((day) => (
              <div key={day.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">{day.name}</h3>
                  <button
                    type="button"
                    onClick={() => handleDeleteDay(day.id)}
                    className="text-red-500 hover:text-red-600"
                  >
                    מחק יום
                  </button>
                </div>

                {/* Exercises List */}
                <div className="space-y-4 mb-4">
                  {day.exercises.map((exercise) => (
                    <div key={exercise.id} className="bg-gray-50 p-4 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{exercise.name}</h4>
                        <button
                          type="button"
                          onClick={() => handleDeleteExercise(day.id, exercise.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          מחק תרגיל
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">סטים:</span> {exercise.sets}
                        </div>
                        <div>
                          <span className="font-medium">חזרות:</span> {exercise.reps}
                        </div>
                        <div>
                          <span className="font-medium">משקל:</span> {exercise.weight} ק"ג
                        </div>
                      </div>
                      {exercise.notes && (
                        <p className="mt-2 text-sm text-gray-500">{exercise.notes}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Exercise Form */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">הוסף תרגיל חדש</h4>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={currentExercise.name}
                      onChange={(e) => setCurrentExercise({ ...currentExercise, name: e.target.value })}
                      className="w-full p-2 border rounded"
                      placeholder="שם התרגיל"
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">סטים</label>
                        <input
                          type="number"
                          min="1"
                          value={currentExercise.sets}
                          onChange={(e) => setCurrentExercise({ ...currentExercise, sets: parseInt(e.target.value) || 1 })}
                          className="mt-1 block w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">חזרות</label>
                        <input
                          type="text"
                          value={currentExercise.reps}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow numbers, hyphens, and spaces
                            if (/^[\d\s-]*$/.test(value)) {
                              setCurrentExercise({ ...currentExercise, reps: value });
                            }
                          }}
                          placeholder="לדוגמה: 8-10 או 12"
                          className="mt-1 block w-full p-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">משקל (ק"ג)</label>
                        <input
                          type="number"
                          min="0"
                          value={currentExercise.weight}
                          onChange={(e) => setCurrentExercise({ ...currentExercise, weight: parseInt(e.target.value) || 0 })}
                          className="mt-1 block w-full p-2 border rounded"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">הערות</label>
                      <textarea
                        value={currentExercise.notes}
                        onChange={(e) => setCurrentExercise({ ...currentExercise, notes: e.target.value })}
                        className="mt-1 block w-full p-2 border rounded"
                        rows={2}
                        placeholder="הוסף הערות לתרגיל"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddExercise(day.id)}
                      className="w-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold py-2 px-4 rounded"
                    >
                      הוסף תרגיל
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Day Form */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">הוסף יום אימון חדש</h3>
            <div className="flex gap-4">
              <input
                type="text"
                value={currentDay.name}
                onChange={(e) => setCurrentDay({ ...currentDay, name: e.target.value })}
                className="flex-1 p-2 border rounded"
                placeholder="שם יום האימון"
              />
              <button
                type="button"
                onClick={handleAddDay}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold py-2 px-4 rounded"
              >
                הוסף יום
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:opacity-50 shadow-md"
            >
              {saving ? 'שומר...' : 'שמור תוכנית'}
            </button>
          </div>
        </form>

        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">⚠️</span>
                <h3 className="text-lg font-medium text-gray-900">
                  אזהרה
                </h3>
              </div>
              <p className="text-gray-600 mb-6">
                יצירת תוכנית אימון חדשה תחליף את התוכנית הקיימת. האם אתה בטוח שברצונך להמשיך?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={savePlan}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  המשך
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CreateWorkoutPlan; 