import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Layout } from '../../components/layout/Layout';
import { Exercise } from '../../types/workout';
import WorkoutHistory from '../../components/workout/WorkoutHistory';

const WorkoutHistoryPage: React.FC = () => {
  const { userData } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExercises = async () => {
      if (!userData?.uid) return;

      try {
        setLoading(true);
        setError(null);

        // Query for all workout sessions
        const sessionsRef = collection(db, 'workoutSessions');
        const q = query(
          sessionsRef,
          where('userId', '==', userData.uid),
          orderBy('date', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const exerciseMap = new Map<string, Exercise>();

        querySnapshot.forEach((doc) => {
          const session = doc.data();
          session.performances?.forEach((performance: any) => {
            if (performance.exerciseId && !exerciseMap.has(performance.exerciseId)) {
              exerciseMap.set(performance.exerciseId, {
                id: performance.exerciseId,
                name: performance.exerciseName || 'תרגיל לא ידוע',
                sets: performance.sets || 0,
                reps: performance.reps || 0,
                weight: performance.weight || 0,
                notes: performance.notes || '',
                restTime: performance.restTime || 0,
              });
            }
          });
        });

        setExercises(Array.from(exerciseMap.values()));
      } catch (err) {
        console.error('Error fetching exercises:', err);
        setError('שגיאה בטעינת תרגילים');
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [userData?.uid]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-center mb-8">היסטוריית אימונים</h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : exercises.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">אין היסטוריית אימונים</h3>
            <p className="mt-1 text-sm text-gray-500">
              התחל לבצע את תוכנית האימון שלך כדי לראות את ההיסטוריה שלך.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {exercises.map((exercise) => (
              <WorkoutHistory key={exercise.id} exercise={exercise} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WorkoutHistoryPage; 