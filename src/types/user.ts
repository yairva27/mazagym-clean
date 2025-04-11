export interface UserData {
  uid: string;
  email: string;
  fullName: string;
  phone?: string;
  phoneNumber?: string;
  avatar?: string;
  role: 'coach' | 'trainee';
  invitationCode?: string;
  coachId?: string;
  createdAt: Date;
  updatedAt: Date;
} 