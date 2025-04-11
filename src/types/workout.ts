export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  notes?: string;
  restTime?: number; // in seconds
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
  lastCompleted?: Date;
}

export interface WorkoutPlan {
  id: string;
  traineeId: string;
  coachId: string;
  name: string;
  description?: string;
  days: WorkoutDay[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastWorkoutDate?: Date;
} 