export type UserRole = 'coach' | 'trainee';

export interface UserData {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  phoneNumber?: string;
  phone?: string; // For backward compatibility
  avatar?: string;
  coachId?: string;
  invitationCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateUserData {
  fullName?: string;
  phoneNumber?: string;
  phone?: string;
  updatedAt: Date;
} 