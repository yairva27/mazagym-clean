import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCoachWorkoutPlans } from '../../hooks/useCoachWorkoutPlans';
import { WorkoutPlan, WorkoutDay, Exercise } from '../../types/workout';
import Layout from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';

const EditWorkoutPlan: React.FC = () => {
  const { traineeId } = useParams<{ traineeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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
    deleteExercise,
  } = useCoachWorkoutPlans(traineeId || '');

  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [newPlanName, setNewPlanName] = useState('');
  const [newDayName, setNewDayName] = useState('');
  const [newExercise, setNewExercise] = useState<Partial<Exercise>>({
    name: '',
    sets: 3,
    reps: 10,
    weight: 0,
    notes: '',
    restTime: 60,
  });

  if (!user || !traineeId) {
    return <div>Unauthorized</div>;
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
        <div className="text-red-500 text-center p-4">{error}</div>
      </Layout>
    );
  }

  const handleCreatePlan = async () => {
    if (!newPlanName.trim()) return;
    await createWorkoutPlan(newPlanName);
    setNewPlanName('');
  };

  const handleCreateDay = async () => {
    if (!selectedPlan || !newDayName.trim()) return;
    await addWorkoutDay(selectedPlan.id, newDayName);
    setNewDayName('');
  };

  const handleAddExercise = async () => {
    if (!selectedPlan || !selectedDay || !newExercise.name) return;
    await addExercise(selectedPlan.id, selectedDay.id, newExercise as Exercise);
    setNewExercise({
      name: '',
      sets: 3,
      reps: 10,
      weight: 0,
      notes: '',
      restTime: 60,
    });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">עריכת תוכנית אימון</h1>
          <button
            onClick={() => navigate('/coach/dashboard')}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            חזרה לדשבורד
          </button>
        </div>

        {/* Create New Plan */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">יצירת תוכנית חדשה</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newPlanName}
              onChange={(e) => setNewPlanName(e.target.value)}
              placeholder="שם התוכנית"
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={handleCreatePlan}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
            >
              צור תוכנית
            </button>
          </div>
        </div>

        {/* Workout Plans List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workoutPlans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-md p-6 ${
                selectedPlan?.id === plan.id ? 'ring-2 ring-primary' : ''
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPlan(plan)}
                    className="bg-primary text-white px-3 py-1 rounded hover:bg-primary-dark"
                  >
                    ערוך
                  </button>
                  <button
                    onClick={() => deleteWorkoutPlan(plan.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    מחק
                  </button>
                  {!plan.isActive && (
                    <button
                      onClick={() => setActivePlan(plan.id)}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      הפעל
                    </button>
                  )}
                </div>
              </div>

              {selectedPlan?.id === plan.id && (
                <div className="space-y-4">
                  {/* Create New Day */}
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={newDayName}
                      onChange={(e) => setNewDayName(e.target.value)}
                      placeholder="שם היום"
                      className="flex-1 p-2 border rounded"
                    />
                    <button
                      onClick={handleCreateDay}
                      className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
                    >
                      הוסף יום
                    </button>
                  </div>

                  {/* Workout Days */}
                  <div className="space-y-4">
                    {plan.days.map((day) => (
                      <div
                        key={day.id}
                        className={`border rounded p-4 ${
                          selectedDay?.id === day.id ? 'border-primary' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{day.name}</h4>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedDay(day)}
                              className="text-primary hover:text-primary-dark"
                            >
                              ערוך
                            </button>
                            <button
                              onClick={() => deleteWorkoutDay(plan.id, day.id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              מחק
                            </button>
                          </div>
                        </div>

                        {selectedDay?.id === day.id && (
                          <div className="space-y-4">
                            {/* Add New Exercise */}
                            <div className="grid grid-cols-2 gap-4">
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
                                value={newExercise.weight}
                                onChange={(e) =>
                                  setNewExercise({
                                    ...newExercise,
                                    weight: parseInt(e.target.value),
                                  })
                                }
                                placeholder="משקל (ק"ג)"
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
                              className="w-full bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
                            >
                              הוסף תרגיל
                            </button>
                          </div>
                        )}

                        {/* Exercises List */}
                        <div className="mt-4 space-y-2">
                          {day.exercises.map((exercise) => (
                            <div
                              key={exercise.id}
                              className="flex justify-between items-center p-2 bg-gray-50 rounded"
                            >
                              <div>
                                <span className="font-medium">{exercise.name}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                  {exercise.sets} x {exercise.reps}
                                  {exercise.weight > 0 && ` @ ${exercise.weight}kg`}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    updateExercise(plan.id, day.id, {
                                      ...exercise,
                                      completed: !exercise.completed,
                                    })
                                  }
                                  className="text-primary hover:text-primary-dark"
                                >
                                  עדכן
                                </button>
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
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default EditWorkoutPlan; 