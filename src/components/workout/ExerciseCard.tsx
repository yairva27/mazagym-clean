import React, { useState } from 'react';
import { Exercise } from '../../types/workout';

interface ExerciseCardProps {
  exercise: Exercise;
  onStatusChange: (id: string, completed: boolean) => void;
  onSave: (id: string, actualWeight: number, actualReps: number, notes: string) => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onStatusChange, onSave }) => {
  const [actualWeight, setActualWeight] = useState<number>(exercise.actualWeight || 0);
  const [actualReps, setActualReps] = useState<number>(exercise.actualReps || 0);
  const [notes, setNotes] = useState<string>(exercise.notes || '');
  const [completed, setCompleted] = useState<boolean>(exercise.completed || false);

  const handleSave = () => {
    onSave(exercise.id, actualWeight, actualReps, notes);
  };

  const handleStatusChange = (newStatus: boolean) => {
    setCompleted(newStatus);
    onStatusChange(exercise.id, newStatus);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold">{exercise.name}</h3>
        {exercise.personalRecord && (
          <div className="text-sm text-green-600">
            שיא אישי: {exercise.personalRecord} ק"ג
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-600">סטים: {exercise.sets}</p>
          <p className="text-gray-600">חזרות: {exercise.reps}</p>
          <p className="text-gray-600">משקל מומלץ: {exercise.weight} ק"ג</p>
        </div>
        <div>
          <input
            type="number"
            value={actualWeight}
            onChange={(e) => setActualWeight(Number(e.target.value))}
            placeholder="משקל בפועל"
            className="w-full p-2 border rounded mb-2"
          />
          <input
            type="number"
            value={actualReps}
            onChange={(e) => setActualReps(Number(e.target.value))}
            placeholder="חזרות בפועל"
            className="w-full p-2 border rounded mb-2"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="הערות"
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => handleStatusChange(!completed)}
          className={`px-4 py-2 rounded ${
            completed ? 'bg-green-500' : 'bg-gray-300'
          } text-white`}
        >
          {completed ? 'הושלם' : 'לא הושלם'}
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          שמור
        </button>
      </div>
    </div>
  );
};

export default ExerciseCard; 