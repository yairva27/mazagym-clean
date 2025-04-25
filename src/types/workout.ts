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
  reps: number | string;  // Allow both number and string for ranges like "8-10"
  weight: number;
  notes?: string;
  restTime?: number; // in seconds
  // Fields for tracking actual performance
  actualWeight?: number;
  actualReps?: number;
  lastCompleted?: Timestamp;
  weightHistory?: WeightHistory[];
  performance?: SetPerformance[];
  // Fields for tracking completion status
  completed?: boolean;
  completedAt?: Timestamp | null;
  // Personal record tracking
  personalRecord?: number;
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