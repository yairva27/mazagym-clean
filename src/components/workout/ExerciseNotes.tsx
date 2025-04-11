import React, { useState } from 'react';
import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface ExerciseNotesProps {
  exerciseId: string;
  workoutPlanId: string;
  dayId: string;
  exerciseIndex: number;
  initialNotes?: string;
}

export const ExerciseNotes: React.FC<ExerciseNotesProps> = ({
  exerciseId,
  workoutPlanId,
  dayId,
  exerciseIndex,
  initialNotes = '',
}) => {
  const [notes, setNotes] = useState(initialNotes);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSaveNotes = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const workoutPlanRef = doc(db, 'workoutPlans', workoutPlanId);
      
      // Create a path to the specific exercise in the nested structure
      const exercisePath = `days.${dayId}.exercises.${exerciseIndex}.notes`;
      
      await updateDoc(workoutPlanRef, {
        [`${exercisePath}`]: notes,
        updatedAt: Timestamp.now(),
      });
      
      setSuccess(true);
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving notes:', err);
      setError('Failed to save notes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <h5 className="text-sm font-medium text-gray-700 mb-2">Exercise Notes</h5>
      
      {error && (
        <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-3 p-2 bg-green-50 text-green-700 text-sm rounded">
          Notes saved successfully!
        </div>
      )}
      
      <div className="space-y-2">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about this exercise (e.g., form tips, how it felt, etc.)"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          rows={3}
          disabled={loading}
        />
        
        <div className="flex justify-end">
          <button
            onClick={handleSaveNotes}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {loading ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
}; 