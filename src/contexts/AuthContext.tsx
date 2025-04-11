import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Define user types
export type UserRole = 'coach' | 'trainee';

export interface UserData {
  uid: string;
  email: string;
  fullName: string;
  phone?: string;
  phoneNumber?: string;
  avatar?: string;
  role: UserRole;
  invitationCode?: string; // For coaches
  coachId?: string; // For trainees
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  signup: (email: string, password: string, fullName: string, role: UserRole, coachId?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  generateInvitationCode: () => Promise<string>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from Firestore
  const fetchUserData = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data() as UserData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Refresh user data
  const refreshUserData = async () => {
    if (currentUser) {
      await fetchUserData(currentUser.uid);
    }
  };

  // Generate a random invitation code
  const generateInvitationCode = async (): Promise<string> => {
    if (!currentUser || !userData || userData.role !== 'coach') {
      throw new Error('Only coaches can generate invitation codes');
    }

    // Generate a random 6-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    try {
      // Create a clean update object without undefined values
      const updateData: Partial<UserData> = {
        invitationCode: code,
        updatedAt: new Date()
      };
      
      // Update the coach's document with the new invitation code
      await setDoc(doc(db, 'users', currentUser.uid), updateData, { merge: true });
      
      // Update local state
      setUserData({
        ...userData,
        invitationCode: code
      });
      
      return code;
    } catch (error) {
      console.error('Error generating invitation code:', error);
      throw error;
    }
  };

  // Sign up function
  const signup = async (email: string, password: string, fullName: string, role: UserRole, coachId?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update display name
      await updateProfile(user, { displayName: fullName });
      
      // Create initial user data without invitation code
      const userData: UserData = {
        uid: user.uid,
        email: user.email!,
        fullName: user.displayName || '',
        role,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Only add coachId if it's provided and not undefined
      if (role === 'trainee' && coachId) {
        userData.coachId = coachId;
      }
      
      // Save user data to Firestore first
      await setDoc(doc(db, 'users', user.uid), userData);
      
      // Set user data in local state
      setUserData(userData);
      
      // For coaches, generate invitation code after user is created
      if (role === 'coach') {
        try {
          // Generate invitation code
          const code = Math.random().toString(36).substring(2, 8).toUpperCase();
          
          // Create a clean update object without undefined values
          const updateData: Partial<UserData> = {
            invitationCode: code,
            updatedAt: new Date()
          };
          
          // Update the coach's document with the invitation code
          await setDoc(doc(db, 'users', user.uid), updateData, { merge: true });
          
          // Update local state
          setUserData({
            ...userData,
            invitationCode: code
          });
        } catch (error) {
          console.error('Error generating invitation code:', error);
          // Continue with signup even if invitation code generation fails
        }
      }
    } catch (error) {
      console.error('Error during signup:', error);
      throw error;
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await fetchUserData(userCredential.user.uid);
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await signOut(auth);
      setUserData(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user.uid);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    signup,
    login,
    logout,
    generateInvitationCode,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 