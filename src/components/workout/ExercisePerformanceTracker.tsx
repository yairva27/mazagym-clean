import React, { useState, useEffect } from 'react';
import { Exercise, SetPerformance } from '../../types/workout';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface ExercisePerformanceTrackerProps {
  exercise: Exercise;
  workoutPlanId: string;
  dayId: string;
  exerciseIndex: number;
}

export const ExercisePerformanceTracker: React.FC<ExercisePerformanceTrackerProps> = ({
  exercise,
  workoutPlanId,
  dayId,
  exerciseIndex,
}) => {
  const [performances, setPerformances] = useState<SetPerformance[]>(
    exercise.performance || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize performances if not already done
  useEffect(() => {
    if (!performances.length && exercise.sets > 0) {
      const initialPerformances: SetPerformance[] = Array.from(
        { length: exercise.sets },
        (_, i) => ({
          setNumber: i + 1,
          completed: false,
          timestamp: new Date(),
        })
      );
      setPerformances(initialPerformances);
    }
  }, [exercise.sets, performances.length]);

  const updatePerformance = async (
    setIndex: number,
    field: 'weight' | 'reps' | 'completed' | 'notes',
    value: any
  ) => {
    setLoading(true);
    setError(null);

    try {
      // Create a new performance object
      const updatedPerformance: SetPerformance = {
        ...performances[setIndex],
        [field]: value,
        timestamp: new Date(),
      };

      // Update local state
      const updatedPerformances = [...performances];
      updatedPerformances[setIndex] = updatedPerformance;
      setPerformances(updatedPerformances);

      // Update in Firebase
      const workoutPlanRef = doc(db, 'workoutPlans', workoutPlanId);
      
      // Create a path to the specific exercise in the nested structure
      const exercisePath = `days.${dayId}.exercises.${exerciseIndex}.performance`;
      
      // Use arrayUnion to add the new performance to the array
      await updateDoc(workoutPlanRef, {
        [`${exercisePath}`]: arrayUnion(updatedPerformance),
        updatedAt: Timestamp.now(),
      });
    } catch (err) {
      console.error('Error updating performance:', err);
      setError('Failed to save performance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <h5 className="text-sm font-medium text-gray-700 mb-2">Performance Tracking</h5>
      
      {error && (
        <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
      
      <div className="space-y-3">
        {performances.map((performance, index) => (
          <div key={index} className="flex items-center space-x-4 p-2 bg-gray-50 rounded">
            <div className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full text-sm font-medium">
              {performance.setNumber}
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500">Weight (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={performance.weight || ''}
                  onChange={(e) => updatePerformance(index, 'weight', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-xs text-gray-500">Reps</label>
                <input
                  type="number"
                  min="0"
                  value={performance.reps || ''}
                  onChange={(e) => updatePerformance(index, 'reps', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={performance.completed}
                onChange={(e) => updatePerformance(index, 'completed', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label className="ml-2 block text-sm text-gray-700">Done</label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 