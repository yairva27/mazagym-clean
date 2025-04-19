import { Timestamp } from 'firebase/firestore';

export interface WeightHistory {
  weight: number;
  timestamp: Timestamp;
  notes?: string;
}

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  notes?: string;
  restTime?: number; // in seconds
  // Fields for tracking actual performance
  actualWeight?: number;
  actualReps?: number;
  lastCompleted?: Timestamp;
  weightHistory?: WeightHistory[];
  performance?: SetPerformance[];
}

export interface SetPerformance {
  setNumber: number;
  weight?: number;
  reps?: number;
  completed: boolean;
  notes?: string;
  timestamp: Date;
}

export interface WorkoutDay {
  id: string;
  name: string; // e.g., "Push Day", "Pull Day"
  exercises: Exercise[];
  notes?: string;
  lastCompleted?: Timestamp;
}

export interface WorkoutPlan {
  id: string;
  workoutPlanName?: string;
  name?: string;
  description?: string;
  days: WorkoutDay[];
  isActive: boolean;
  traineeId: string;
  coachId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastWorkoutDate?: Timestamp;
} 