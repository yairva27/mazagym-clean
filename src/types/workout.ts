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
  id?: string;
  traineeId: string;
  coachId?: string;
  workoutPlanName: string;
  name?: string; // For backward compatibility
  description?: string;
  days: WorkoutDay[];
  createdAt: Date | any; // Allow Firestore Timestamp
  updatedAt?: Date | any; // Allow Firestore Timestamp
  isActive: boolean;
  lastWorkoutDate?: Date | any; // Allow Firestore Timestamp
} 