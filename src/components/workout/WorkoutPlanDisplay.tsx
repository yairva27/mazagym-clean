import React from 'react';
import { WorkoutPlan, WorkoutDay, Exercise } from '../../types/workout';
import { ExercisePerformanceTracker } from './ExercisePerformanceTracker';
import { ExerciseNotes } from './ExerciseNotes';
import { useAuth } from '../../contexts/AuthContext';

interface WorkoutPlanDisplayProps {
  workoutPlan: WorkoutPlan;
}

export const WorkoutPlanDisplay: React.FC<WorkoutPlanDisplayProps> = ({ workoutPlan }) => {
  const { userData } = useAuth();
  const isTrainee = userData?.role === 'trainee';

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatRestTime = (seconds?: number) => {
    if (!seconds) return 'No rest specified';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900">{workoutPlan.name}</h2>
        {workoutPlan.description && (
          <p className="mt-2 text-gray-600">{workoutPlan.description}</p>
        )}
        <div className="mt-4 text-sm text-gray-500">
          <p>Last updated: {formatDate(workoutPlan.updatedAt)}</p>
          {workoutPlan.lastWorkoutDate && (
            <p>Last workout: {formatDate(workoutPlan.lastWorkoutDate)}</p>
          )}
        </div>
      </div>

      {/* Workout Days */}
      <div className="space-y-6">
        {workoutPlan.days.map((day: WorkoutDay, dayIndex: number) => (
          <div key={day.id} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">{day.name}</h3>
              {day.notes && (
                <p className="mt-1 text-sm text-gray-500">{day.notes}</p>
              )}
              {day.lastCompleted && (
                <p className="mt-1 text-sm text-green-600">
                  Last completed: {formatDate(day.lastCompleted)}
                </p>
              )}
            </div>
            
            <div className="px-6 py-4">
              <div className="space-y-4">
                {day.exercises.map((exercise: Exercise, exerciseIndex: number) => (
                  <div key={exercise.id} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{exercise.name}</h4>
                        <div className="mt-1 text-sm text-gray-500">
                          <p>{exercise.sets} sets × {exercise.reps} reps</p>
                          {exercise.weight && <p>Weight: {exercise.weight}kg</p>}
                          {exercise.restTime && <p>Rest: {formatRestTime(exercise.restTime)}</p>}
                        </div>
                      </div>
                    </div>
                    {exercise.notes && (
                      <p className="mt-2 text-sm text-gray-600 italic">{exercise.notes}</p>
                    )}
                    
                    {/* Performance Tracker and Notes - Only show for trainees */}
                    {isTrainee && (
                      <>
                        <ExercisePerformanceTracker
                          exercise={exercise}
                          workoutPlanId={workoutPlan.id}
                          dayId={day.id}
                          exerciseIndex={exerciseIndex}
                        />
                        
                        <ExerciseNotes
                          exerciseId={exercise.id}
                          workoutPlanId={workoutPlan.id}
                          dayId={day.id}
                          exerciseIndex={exerciseIndex}
                          initialNotes={exercise.notes || ''}
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 