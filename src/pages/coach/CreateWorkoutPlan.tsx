import React, { useState, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useCoachWorkoutPlans } from '../../hooks/useCoachWorkoutPlans';
import { WorkoutPlan, WorkoutDay, Exercise } from '../../types/workout';
import { doc, collection, setDoc, Timestamp } from 'firebase/firestore';
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
    reps: 10,
    weight: 0,
    notes: '',
    restTime: 60
  });

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
    if (!currentExercise.name.trim()) {
      setError('נא להזין שם לתרגיל');
      return;
    }

    setDays(days.map(day => {
      if (day.id === dayId) {
        return {
          ...day,
          exercises: [...day.exercises, { ...currentExercise, id: crypto.randomUUID() }]
        };
      }
      return day;
    }));

    setCurrentExercise({
      id: crypto.randomUUID(),
      name: '',
      sets: 3,
      reps: 10,
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
      if (!planName.trim()) {
        setError('נא להזין שם תוכנית');
        return;
      }

      if (days.length === 0) {
        setError('נא להוסיף לפחות אימון אחד');
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

      setSaving(true);

      // Create the workout plan with all required fields
      const now = Timestamp.now();
      const workoutPlan: WorkoutPlan = {
        traineeId,
        coachId: userData.uid,
        workoutPlanName: planName.trim(),
        name: planName.trim(), // For backward compatibility
        description: '', // Empty string instead of undefined
        isActive: true,
        days: days.map(day => ({
          id: day.id,
          name: day.name.trim(),
          exercises: day.exercises.map(exercise => ({
            id: exercise.id,
            name: exercise.name.trim(),
            sets: safeNumber(exercise.sets),
            reps: safeNumber(exercise.reps),
            weight: safeNumber(exercise.weight),
            notes: exercise.notes?.trim() || '',
            restTime: safeNumber(exercise.restTime)
          })),
          notes: day.notes?.trim() || ''
        })),
        createdAt: now,
        updatedAt: now
      };

      // Create the workout plan in Firestore
      const docRef = doc(collection(db, 'workoutPlans'));
      await setDoc(docRef, workoutPlan);
      
      // Navigate to the workout page
      navigate(`/coach/trainee/${traineeId}/workout`);
    } catch (err) {
      console.error('Error creating workout plan:', err);
      setError('אירעה שגיאה בשמירת תוכנית האימון');
    } finally {
      setSaving(false);
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
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
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
                          type="number"
                          min="1"
                          value={currentExercise.reps}
                          onChange={(e) => setCurrentExercise({ ...currentExercise, reps: parseInt(e.target.value) || 1 })}
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
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={saving}
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-white font-bold rounded-md hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? 'שומר...' : 'שמור תוכנית'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateWorkoutPlan; 