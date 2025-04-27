import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, doc, setDoc, getDoc, Timestamp, writeBatch, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { WorkoutPlan, WorkoutDay, Exercise } from '../../types/workout';
import { v4 as uuidv4 } from 'uuid';

// Validation helpers
const safeString = (input: any): string => typeof input === 'string' ? input : '';
const safeNumber = (input: any): number => {
  const num = Number(input);
  return !isNaN(num) ? num : 0;
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
      if (!traineeId) {
        const errorMsg = 'לא נמצא מתאמן';
        setError(errorMsg);
        alert(errorMsg);
        navigate('/coach/dashboard');
        return;
      }

      if (!userData?.uid) {
        const errorMsg = 'לא נמצא משתמש מחובר';
        setError(errorMsg);
        alert(errorMsg);
        navigate('/login');
        return;
      }
      
      try {
        const plansRef = collection(db, 'workoutPlans');
        const q = query(plansRef, where('traineeId', '==', traineeId), where('isActive', '==', true));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const plan = querySnapshot.docs[0].data() as WorkoutPlan;
          setExistingPlan(plan);
        }
      } catch (err) {
        console.error('Error checking existing plan:', err);
        const errorMsg = 'שגיאה בבדיקת תוכנית קיימת';
        setError(errorMsg);
        alert(errorMsg);
        navigate('/coach/dashboard');
      }
    };

    checkExistingPlan();
  }, [traineeId, userData?.uid, navigate]);

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
    
    try {
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

      if (!planName.trim()) {
        throw new Error('נא להזין שם תוכנית');
      }

      if (days.length === 0) {
        throw new Error('נא להוסיף לפחות אימון אחד');
      }

      // Validate exercises
      const hasInvalidExercises = days.some(day => 
        !day.exercises?.some(exercise => 
          exercise && typeof exercise.name === 'string' && exercise.name.trim() !== ''
        )
      );
      
      if (hasInvalidExercises) {
        throw new Error('נא לוודא שכל ימי האימון מכילים לפחות תרגיל אחד תקין');
      }

      // Validate reps format for all exercises
      const hasInvalidReps = days.some(day =>
        day.exercises?.some(exercise => !validateReps(exercise.reps))
      );

      if (hasInvalidReps) {
        throw new Error('אנא הזן מספר או טווח חזרות תקין (למשל: 8-10)');
      }

      if (!userData?.uid) {
        throw new Error('לא נמצא משתמש מחובר');
      }

      if (!traineeId) {
        throw new Error('לא נמצא מתאמן');
      }

      if (existingPlan) {
        setShowConfirmation(true);
        return;
      }

      await savePlan();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      const errorMessage = err instanceof Error ? err.message : 'אירעה שגיאה בשמירת תוכנית האימון';
      setError(errorMessage);
      alert(errorMessage);
    }
  };

  const savePlan = async () => {
    setSaving(true);
    setError(null);
    
    try {
      if (!traineeId || !userData?.uid) {
        throw new Error('חסרים פרטי משתמש');
      }

      // Check if trainee exists
      const traineeDoc = await getDoc(doc(db, 'users', traineeId));
      if (!traineeDoc.exists()) {
        throw new Error('לא נמצא מתאמן');
      }

      // Delete existing active plan if exists
      const plansRef = collection(db, 'workoutPlans');
      const q = query(plansRef, where('traineeId', '==', traineeId), where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isActive: false });
      });

      // Create new plan
      const newPlanRef = doc(collection(db, 'workoutPlans'));
      const newPlan: WorkoutPlan = {
        id: newPlanRef.id,
        traineeId,
        coachId: userData.uid,
        name: planName,
        description: planDescription || '',
        days: days.map(day => ({
          ...day,
          exercises: day.exercises.map(ex => ({
            ...ex,
            id: uuidv4()
          }))
        })),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      batch.set(newPlanRef, newPlan);
      await batch.commit();

      // Update trainee's user document
      await updateDoc(doc(db, 'users', traineeId), {
        hasActivePlan: true,
        activePlanId: newPlanRef.id
      });

      navigate('/coach/dashboard');
    } catch (err) {
      console.error('Error saving plan:', err);
      const errorMsg = err instanceof Error ? err.message : 'שגיאה בשמירת התוכנית';
      setError(errorMsg);
      alert(errorMsg);
    } finally {
      setSaving(false);
      setShowConfirmation(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold">יצירת תוכנית אימון חדשה</h1>
          <button
            onClick={() => navigate('/coach/dashboard')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center transition-colors"
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