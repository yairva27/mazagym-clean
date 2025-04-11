import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCoachWorkoutPlans } from '../../hooks/useCoachWorkoutPlans';
import { WorkoutPlan, WorkoutDay, Exercise } from '../../types/workout';
import { Layout } from '../../components/layout/Layout';

interface ManageWorkoutPlansProps {
  traineeId: string;
}

const ManageWorkoutPlans: React.FC<ManageWorkoutPlansProps> = ({ traineeId }) => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const {
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
  } = useCoachWorkoutPlans(traineeId);

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanDescription, setNewPlanDescription] = useState('');
  const [newDayName, setNewDayName] = useState('');
  const [newExercise, setNewExercise] = useState<Omit<Exercise, 'id'>>({
    name: '',
    sets: 3,
    reps: 10,
    weight: 0,
    notes: '',
    restTime: 60
  });

  if (!userData?.uid) {
    return (
      <Layout>
        <div className="text-center text-red-500">לא מורשה</div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-center text-red-500">{error}</div>
      </Layout>
    );
  }

  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) return;
    try {
      const planId = await createWorkoutPlan(newPlanName, newPlanDescription);
      setNewPlanName('');
      setNewPlanDescription('');
      setSelectedPlan(planId);
    } catch (err) {
      console.error('Error creating plan:', err);
    }
  };

  const handleAddDay = async () => {
    if (!selectedPlan || !newDayName.trim()) return;
    try {
      await addWorkoutDay(selectedPlan, newDayName);
      setNewDayName('');
    } catch (err) {
      console.error('Error adding day:', err);
    }
  };

  const handleAddExercise = async () => {
    if (!selectedPlan || !selectedDay || !newExercise.name.trim()) return;
    try {
      await addExercise(selectedPlan, selectedDay, newExercise);
      setNewExercise({
        name: '',
        sets: 3,
        reps: 10,
        weight: 0,
        notes: '',
        restTime: 60
      });
    } catch (err) {
      console.error('Error adding exercise:', err);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">ניהול תוכניות אימון</h1>
          <button
            onClick={() => navigate('/coach/dashboard')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            חזרה לדשבורד
          </button>
        </div>

        {/* Create New Plan */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">צור תוכנית אימון חדשה</h2>
          <div className="space-y-4">
            <input
              type="text"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder="שם התוכנית"
              className="w-full p-2 border rounded"
            />
            <textarea
              value={newPlanDescription}
              onChange={(e) => setNewPlanDescription(e.target.value)}
              placeholder="תיאור התוכנית"
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleCreatePlan}
              className="w-full bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
            >
              צור תוכנית
            </button>
          </div>
        </div>

        {/* Workout Plans List */}
        <div className="space-y-6">
          {workoutPlans.map((plan) => (
            <div key={plan.id} className="bg-white p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  {plan.description && (
                    <p className="text-gray-600">{plan.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActivePlan(plan.id)}
                    className={`px-4 py-2 rounded ${
                      plan.isActive
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {plan.isActive ? 'פעיל' : 'הפעל'}
                  </button>
                  <button
                    onClick={() => deleteWorkoutPlan(plan.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    מחק
                  </button>
                </div>
              </div>

              {/* Add New Day */}
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDayName}
                    onChange={(e) => setNewDayName(e.target.value)}
                    placeholder="שם יום האימון"
                    className="flex-1 p-2 border rounded"
                  />
                  <button
                    onClick={handleAddDay}
                    className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
                  >
                    הוסף יום
                  </button>
                </div>
              </div>

              {/* Workout Days */}
              <div className="space-y-4">
                {plan.days.map((day) => (
                  <div key={day.id} className="border rounded p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-medium">{day.name}</h4>
                      <button
                        onClick={() => deleteWorkoutDay(plan.id, day.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        מחק יום
                      </button>
                    </div>

                    {/* Add New Exercise */}
                    <div className="mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <input
                          type="text"
                          value={newExercise.name}
                          onChange={(e) =>
                            setNewExercise({ ...newExercise, name: e.target.value })
                          }
                          placeholder="שם התרגיל"
                          className="p-2 border rounded"
                        />
                        <input
                          type="number"
                          value={newExercise.sets}
                          onChange={(e) =>
                            setNewExercise({
                              ...newExercise,
                              sets: parseInt(e.target.value),
                            })
                          }
                          placeholder="מספר סטים"
                          className="p-2 border rounded"
                        />
                        <input
                          type="number"
                          value={newExercise.reps}
                          onChange={(e) =>
                            setNewExercise({
                              ...newExercise,
                              reps: parseInt(e.target.value),
                            })
                          }
                          placeholder="מספר חזרות"
                          className="p-2 border rounded"
                        />
                        <input
                          type="number"
                          value={newExercise.weight || 0}
                          onChange={(e) =>
                            setNewExercise({
                              ...newExercise,
                              weight: parseInt(e.target.value) || 0,
                            })
                          }
                          placeholder="Weight (kg)"
                          className="p-2 border rounded"
                        />
                        <input
                          type="number"
                          value={newExercise.restTime}
                          onChange={(e) =>
                            setNewExercise({
                              ...newExercise,
                              restTime: parseInt(e.target.value),
                            })
                          }
                          placeholder="זמן מנוחה (שניות)"
                          className="p-2 border rounded"
                        />
                        <textarea
                          value={newExercise.notes}
                          onChange={(e) =>
                            setNewExercise({ ...newExercise, notes: e.target.value })
                          }
                          placeholder="הערות"
                          className="p-2 border rounded"
                        />
                      </div>
                      <button
                        onClick={handleAddExercise}
                        className="w-full mt-4 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
                      >
                        הוסף תרגיל
                      </button>
                    </div>

                    {/* Exercises List */}
                    <div className="space-y-2">
                      {day.exercises.map((exercise) => (
                        <div
                          key={exercise.id}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <span className="font-medium">{exercise.name}</span>
                            <span className="text-sm text-gray-500 mr-2">
                              {exercise.sets} x {exercise.reps}
                              {exercise.weight && exercise.weight > 0 && ` @ ${exercise.weight}kg`}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                deleteExercise(plan.id, day.id, exercise.id)
                              }
                              className="text-red-500 hover:text-red-600"
                            >
                              מחק
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default ManageWorkoutPlans; 