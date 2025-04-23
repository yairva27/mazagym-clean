import React, { useState } from 'react';
import { WorkoutPlan } from '../../types/workout';
import { ExercisePerformanceTracker } from './ExercisePerformanceTracker';
import { ExerciseNotes } from './ExerciseNotes';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import { Exercise } from '../../types/workout';
import { WeightHistoryChart } from './WeightHistoryChart';

interface WorkoutPlanDisplayProps {
  workoutPlan: WorkoutPlan;
}

export const WorkoutPlanDisplay: React.FC<WorkoutPlanDisplayProps> = ({ workoutPlan }) => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const isTrainee = userData?.role === 'trainee';
  const [visibleChartId, setVisibleChartId] = useState<string | null>(null);

  console.log('Rendering WorkoutPlanDisplay:', {
    planId: workoutPlan.id,
    daysCount: workoutPlan.days.length,
    exercises: workoutPlan.days.flatMap(d => d.exercises.map(e => ({
      id: e.id,
      name: e.name,
      weight: e.weight,
      actualWeight: e.actualWeight,
      hasHistory: e.weightHistory && e.weightHistory.length > 0,
      completed: e.completed,
      completedAt: e.completedAt
    })))
  });

  const formatDate = (date: Date | Timestamp | { seconds: number; nanoseconds: number } | undefined | null) => {
    if (!date) return null;
    try {
      let dateObj: Date;
      
      if (date instanceof Timestamp) {
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        dateObj = date;
      } else if (typeof date === 'object' && date && 'seconds' in date && 'nanoseconds' in date) {
        // Handle Firestore Timestamp-like objects
        dateObj = new Timestamp(date.seconds, date.nanoseconds).toDate();
      } else {
        dateObj = new Date(date);
      }

      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date object:', date);
        return null;
      }

      return new Intl.DateTimeFormat('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj);
    } catch (err) {
      console.error('Error formatting date:', err, date);
      return null;
    }
  };

  const formatRestTime = (seconds?: number) => {
    if (!seconds) return 'לא צוין זמן מנוחה';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} דקות ${remainingSeconds} שניות`;
  };

  const handleDayClick = (dayId: string) => {
    if (isTrainee) {
      navigate(`/trainee/workout/${dayId}`);
    }
  };

  const getDisplayWeight = (exercise: Exercise) => {
    // Always show actual weight if available, for both trainees and coaches
    const actualWeight = exercise.actualWeight ?? exercise.weight;
    const hasActualWeight = exercise.actualWeight !== undefined;
    
    console.log('Getting display weight:', {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      plannedWeight: exercise.weight,
      actualWeight: exercise.actualWeight,
      displayWeight: actualWeight,
      hasActualWeight,
      userRole: userData?.role,
      completed: exercise.completed,
      completedAt: exercise.completedAt
    });

    if (hasActualWeight) {
      return {
        weight: actualWeight,
        isActual: true
      };
    }
    
    // Fallback to planned weight
    return {
      weight: exercise.weight,
      isActual: false
    };
  };

  const toggleChartVisibility = (exerciseId: string) => {
    setVisibleChartId(visibleChartId === exerciseId ? null : exerciseId);
  };

  const getPersonalRecord = (exercise: Exercise): number | null => {
    if (!exercise.weightHistory || exercise.weightHistory.length === 0) {
      return null;
    }
    
    // Find the highest weight in the history
    const highestWeight = Math.max(...exercise.weightHistory.map(h => h.weight));
    return highestWeight > 0 ? highestWeight : null;
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded inline-flex items-center"
        >
          <span className="mr-2">←</span>
          חזור
        </button>
      </div>

      {/* Plan Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900">{workoutPlan.workoutPlanName || workoutPlan.name || 'תוכנית ללא שם'}</h2>
        {workoutPlan.description && (
          <p className="mt-2 text-gray-600">{workoutPlan.description}</p>
        )}
        <div className="mt-4 text-sm text-gray-500">
          {formatDate(workoutPlan.createdAt) && (
            <p>נוצר בתאריך: {formatDate(workoutPlan.createdAt)}</p>
          )}
          {formatDate(workoutPlan.updatedAt) && (
            <p>עודכן לאחרונה: {formatDate(workoutPlan.updatedAt)}</p>
          )}
          {formatDate(workoutPlan.lastWorkoutDate) && (
            <p>אימון אחרון: {formatDate(workoutPlan.lastWorkoutDate)}</p>
          )}
        </div>
      </div>

      {/* Workout Days */}
      <div className="space-y-6">
        {workoutPlan.days.map((day, index) => (
          <div 
            key={day.id || index} 
            className={`border rounded-lg p-4 ${isTrainee ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            onClick={() => isTrainee && day.id && handleDayClick(day.id)}
          >
            <h3 className="text-xl font-semibold mb-3">{day.name}</h3>
            <div className="space-y-4">
              {day.exercises.map((exercise, exerciseIndex) => {
                const displayWeight = getDisplayWeight(exercise);
                console.log('Rendering exercise:', {
                  exerciseId: exercise.id,
                  name: exercise.name,
                  plannedWeight: exercise.weight,
                  actualWeight: exercise.actualWeight,
                  displayWeight,
                  hasHistory: exercise.weightHistory && exercise.weightHistory.length > 0
                });

                return (
                  <div key={exercise.id || exerciseIndex} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <h4 className="text-lg font-medium">{exercise.name}</h4>
                      {exercise.weightHistory && exercise.weightHistory.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleChartVisibility(exercise.id);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                          title="היסטוריית משקלים"
                        >
                          📈
                        </button>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">סטים:</span> {exercise.sets}
                      </div>
                      <div>
                        <span className="font-medium">חזרות:</span> {exercise.reps}
                      </div>
                      <div>
                        {displayWeight.isActual ? (
                          <>
                            <div>
                              <span className="font-medium">משקל בפועל:</span>{' '}
                              <span className="text-blue-600">{displayWeight.weight} ק"ג</span>
                            </div>
                            {getPersonalRecord(exercise) && (
                              <div className="text-xs text-green-600">
                                💪 שיא אישי: {getPersonalRecord(exercise)} ק"ג
                              </div>
                            )}
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">משקל מתוכנן:</span> {exercise.weight} ק"ג
                            </div>
                            {exercise.lastCompleted && (
                              <div className="text-xs text-gray-500">
                                עודכן: {formatDate(exercise.lastCompleted)}
                              </div>
                            )}
                          </>
                        ) : (
                          <div>
                            <span className="font-medium">משקל מתוכנן:</span> {displayWeight.weight} ק"ג
                          </div>
                        )}
                      </div>
                    </div>
                    {exercise.notes && (
                      <p className="mt-2 text-sm text-gray-500">{exercise.notes}</p>
                    )}
                    {exercise.restTime && (
                      <p className="mt-2 text-sm text-gray-500">
                        <span className="font-medium">זמן מנוחה:</span> {formatRestTime(exercise.restTime)}
                      </p>
                    )}
                    {exercise.weightHistory && exercise.weightHistory.length > 0 && (
                      <div className="mt-2 text-sm text-gray-500">
                        <span className="font-medium">היסטוריית משקלים:</span>
                        <div className="mt-1 space-y-1">
                          {exercise.weightHistory.slice(-3).map((history, i) => (
                            <div key={i} className="flex justify-between">
                              <span>{history.weight} ק"ג</span>
                              <span>{formatDate(history.timestamp)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Weight History Chart */}
                    {exercise.weightHistory && (
                      <WeightHistoryChart 
                        history={exercise.weightHistory} 
                        isVisible={visibleChartId === exercise.id} 
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 