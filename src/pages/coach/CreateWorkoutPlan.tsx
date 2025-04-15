import React, { useState, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useCoachWorkoutPlans } from '../../hooks/useCoachWorkoutPlans';
import { WorkoutPlan, WorkoutDay, Exercise } from '../../types/workout';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const CreateWorkoutPlan: React.FC = () => {
  const { traineeId } = useParams<{ traineeId: string }>();
  const navigate = useNavigate();
  const { createWorkoutPlan, loading, error } = useCoachWorkoutPlans(traineeId || '');

  const [planName, setPlanName] = useState('');
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [currentDay, setCurrentDay] = useState<WorkoutDay>({
    id: '',
    name: '',
    exercises: []
  });

  const [currentExercise, setCurrentExercise] = useState<Exercise>({
    id: '',
    name: '',
    sets: 0,
    reps: 0,
    weight: 0,
    notes: ''
  });

  const handleAddDay = () => {
    if (currentDay.name && currentDay.exercises.length > 0) {
      setDays([...days, { ...currentDay, id: Date.now().toString() }]);
      setCurrentDay({
        id: '',
        name: '',
        exercises: []
      });
    }
  };

  const handleAddExercise = () => {
    if (currentExercise.name && currentExercise.sets > 0 && currentExercise.reps > 0) {
      setCurrentDay({
        ...currentDay,
        exercises: [...currentDay.exercises, { ...currentExercise, id: Date.now().toString() }]
      });
      setCurrentExercise({
        id: '',
        name: '',
        sets: 0,
        reps: 0,
        weight: 0,
        notes: ''
      });
    }
  };

  const handleDeleteDay = (dayId: string) => {
    setDays(days.filter(day => day.id !== dayId));
  };

  const handleDeleteExercise = (exerciseId: string) => {
    setCurrentDay({
      ...currentDay,
      exercises: currentDay.exercises.filter(ex => ex.id !== exerciseId)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName || days.length === 0) return;

    try {
      // Create a new workout plan with the provided data
      const planId = await createWorkoutPlan(planName);
      
      // Update the plan with the days
      const planRef = doc(db, 'workoutPlans', planId);
      await updateDoc(planRef, {
        days,
        isActive: true,
        updatedAt: Timestamp.now()
      });
      
      navigate(`/coach/trainee/${traineeId}/workout`);
    } catch (err) {
      console.error('Error creating workout plan:', err);
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">יצירת תוכנית אימון חדשה</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              שם התוכנית
            </label>
            <input
              type="text"
              value={planName}
              onChange={(e) => setPlanName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">הוספת יום אימון</h2>
            
            <div className="space-y-4">
              <input
                type="text"
                value={currentDay.name}
                onChange={(e) => setCurrentDay({ ...currentDay, name: e.target.value })}
                placeholder="שם היום"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />

              <div className="border-t pt-4">
                <h3 className="text-md font-medium mb-2">תרגילים ליום זה</h3>
                
                <div className="space-y-4">
                  {currentDay.exercises.map((exercise) => (
                    <div key={exercise.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <div>
                        <p className="font-medium">{exercise.name}</p>
                        <p className="text-sm text-gray-600">
                          {exercise.sets} סטים x {exercise.reps} חזרות
                          {exercise.weight && exercise.weight > 0 && ` @ ${exercise.weight} ק"ג`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteExercise(exercise.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        מחק
                      </button>
                    </div>
                  ))}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={currentExercise.name}
                      onChange={(e) => setCurrentExercise({ ...currentExercise, name: e.target.value })}
                      placeholder="שם התרגיל"
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                      type="number"
                      value={currentExercise.sets}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentExercise({ ...currentExercise, sets: parseInt(e.target.value) || 0 })}
                      placeholder="מספר סטים"
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                      type="number"
                      value={currentExercise.reps}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentExercise({ ...currentExercise, reps: parseInt(e.target.value) || 0 })}
                      placeholder="מספר חזרות"
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                      type="number"
                      value={currentExercise.weight}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setCurrentExercise({ ...currentExercise, weight: parseInt(e.target.value) || 0 })}
                      placeholder="משקל (ק״ג)"
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddExercise}
                    className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                  >
                    הוסף תרגיל
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddDay}
                className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
              >
                הוסף יום אימון
              </button>
            </div>
          </div>

          {days.length > 0 && (
            <div className="border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">ימי אימון שהוספת</h2>
              <div className="space-y-4">
                {days.map((day) => (
                  <div key={day.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <div>
                      <p className="font-medium">{day.name}</p>
                      <p className="text-sm text-gray-600">{day.exercises.length} תרגילים</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteDay(day.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      מחק
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate(`/coach/trainee/${traineeId}/workout`)}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!planName || days.length === 0}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50"
            >
              שמור תוכנית
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateWorkoutPlan; 