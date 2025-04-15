import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  notes: string;
  restTime: number;
}

interface WorkoutDay {
  id: string;
  name: string;
  exercises: Exercise[];
}

interface WorkoutPlan {
  id: string;
  name: string;
  traineeId: string;
  coachId: string;
  isActive: boolean;
  days: WorkoutDay[];
  createdAt: Date;
  updatedAt: Date;
}

const EditWorkoutPlan: React.FC = () => {
  const { traineeId } = useParams<{ traineeId: string }>();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null);
  const [newExercise, setNewExercise] = useState<Partial<Exercise>>({
    name: '',
    sets: 3,
    reps: 10,
    weight: 0,
    notes: '',
    restTime: 60,
  });

  useEffect(() => {
    const fetchWorkoutPlan = async () => {
      if (!traineeId || !userData?.uid) return;

      try {
        setLoading(true);
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

        const planDoc = querySnapshot.docs[0];
        const planData = planDoc.data();
        
        setWorkoutPlan({
          id: planDoc.id,
          name: planData.name || '',
          traineeId: planData.traineeId,
          coachId: planData.coachId,
          isActive: planData.isActive,
          days: planData.days || [],
          createdAt: planData.createdAt?.toDate() || new Date(),
          updatedAt: planData.updatedAt?.toDate() || new Date()
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

  const handleUpdatePlan = async () => {
    if (!workoutPlan || !traineeId) return;

    try {
      const planRef = doc(db, 'workoutPlans', workoutPlan.id);
      await updateDoc(planRef, {
        ...workoutPlan,
        updatedAt: Timestamp.now()
      });
      
      navigate('/coach/dashboard');
    } catch (err) {
      console.error('Error updating workout plan:', err);
      setError('שגיאה בעדכון תוכנית האימון');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4">טוען תוכנית אימון...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-6">עריכת תוכנית אימון</h1>
            <div className="bg-white shadow rounded-lg p-8 max-w-md mx-auto">
              <p className="text-gray-600 mb-6">לא נמצאה תוכנית אימון למתאמן זה.</p>
              <Link
                to={`/coach/trainee/${traineeId}/create-plan`}
                className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
              >
                יצירת תוכנית אימון
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

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

        {workoutPlan && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                שם התוכנית
              </label>
              <input
                type="text"
                value={workoutPlan.name}
                onChange={(e) => setWorkoutPlan({ ...workoutPlan, name: e.target.value })}
                className="w-full p-2 border rounded-lg"
              />
            </div>

            <div className="space-y-6">
              {workoutPlan.days.map((day, dayIndex) => (
                <div key={day.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <input
                      type="text"
                      value={day.name}
                      onChange={(e) => {
                        const updatedDays = [...workoutPlan.days];
                        updatedDays[dayIndex] = { ...day, name: e.target.value };
                        setWorkoutPlan({ ...workoutPlan, days: updatedDays });
                      }}
                      className="text-lg font-medium p-2 border rounded"
                    />
                    <button
                      onClick={() => {
                        const updatedDays = workoutPlan.days.filter(d => d.id !== day.id);
                        setWorkoutPlan({ ...workoutPlan, days: updatedDays });
                      }}
                      className="text-red-500 hover:text-red-600"
                    >
                      מחק יום
                    </button>
                  </div>

                  <div className="space-y-4">
                    {day.exercises.map((exercise, exerciseIndex) => (
                      <div key={exercise.id} className="border rounded p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              תרגיל
                            </label>
                            <input
                              type="text"
                              value={exercise.name}
                              onChange={(e) => {
                                const updatedDays = [...workoutPlan.days];
                                updatedDays[dayIndex].exercises[exerciseIndex].name = e.target.value;
                                setWorkoutPlan({ ...workoutPlan, days: updatedDays });
                              }}
                              className="w-full p-2 border rounded"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                סטים
                              </label>
                              <input
                                type="number"
                                value={exercise.sets}
                                onChange={(e) => {
                                  const updatedDays = [...workoutPlan.days];
                                  updatedDays[dayIndex].exercises[exerciseIndex].sets = Number(e.target.value);
                                  setWorkoutPlan({ ...workoutPlan, days: updatedDays });
                                }}
                                className="w-full p-2 border rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                חזרות
                              </label>
                              <input
                                type="number"
                                value={exercise.reps}
                                onChange={(e) => {
                                  const updatedDays = [...workoutPlan.days];
                                  updatedDays[dayIndex].exercises[exerciseIndex].reps = Number(e.target.value);
                                  setWorkoutPlan({ ...workoutPlan, days: updatedDays });
                                }}
                                className="w-full p-2 border rounded"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                משקל
                              </label>
                              <input
                                type="number"
                                value={exercise.weight}
                                onChange={(e) => {
                                  const updatedDays = [...workoutPlan.days];
                                  updatedDays[dayIndex].exercises[exerciseIndex].weight = Number(e.target.value);
                                  setWorkoutPlan({ ...workoutPlan, days: updatedDays });
                                }}
                                className="w-full p-2 border rounded"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const updatedDays = [...workoutPlan.days];
                        updatedDays[dayIndex].exercises.push({
                          id: Date.now().toString(),
                          name: 'תרגיל חדש',
                          sets: 3,
                          reps: 10,
                          weight: 0,
                          notes: '',
                          restTime: 60
                        });
                        setWorkoutPlan({ ...workoutPlan, days: updatedDays });
                      }}
                      className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                    >
                      הוסף תרגיל
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between">
              <button
                onClick={() => {
                  setWorkoutPlan({
                    ...workoutPlan,
                    days: [
                      ...workoutPlan.days,
                      {
                        id: Date.now().toString(),
                        name: 'יום חדש',
                        exercises: []
                      }
                    ]
                  });
                }}
                className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
              >
                הוסף יום אימון
              </button>
              <button
                onClick={handleUpdatePlan}
                className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700"
              >
                שמור שינויים
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EditWorkoutPlan; 