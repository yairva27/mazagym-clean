import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
  signup: (email: string, password: string, fullName: string, role: UserRole, invitationCode?: string) => Promise<void>;
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
      console.log('Fetching user data for ID:', uid);
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as UserData;
        console.log('Found user data:', data.fullName, data.email, 'role:', data.role);
        if (data.coachId) {
          console.log('User has coachId:', data.coachId);
        }
        setUserData(data);
      } else {
        console.error('User document not found for ID:', uid);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Refresh user data
  const refreshUserData = async () => {
    if (currentUser) {
      console.log('Refreshing user data for ID:', currentUser.uid);
      await fetchUserData(currentUser.uid);
    } else {
      console.error('Cannot refresh user data: no current user');
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
  const signup = async (email: string, password: string, fullName: string, role: UserRole, invitationCode?: string) => {
    try {
      // For trainees, verify invitation code and get coachId first
      let coachDoc;
      if (role === 'trainee') {
        if (!invitationCode) {
          throw new Error('קוד הזמנה נדרש להרשמה');
        }

        // Find coach with this invitation code
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef, 
          where('invitationCode', '==', invitationCode.trim().toUpperCase()),
          where('role', '==', 'coach')
        );
        
        console.log('Searching for coach with invitation code:', invitationCode.trim().toUpperCase());
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.error('No coach found with invitation code:', invitationCode);
          throw new Error('קוד הזמנה לא תקין');
        }
        
        coachDoc = querySnapshot.docs[0];
        console.log('Found coach document:', { 
          coachId: coachDoc.id, 
          invitationCode: coachDoc.data().invitationCode,
          coachName: coachDoc.data().fullName
        });
      }

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      // Update display name
      await updateProfile(newUser, { displayName: fullName });

      // Save to Firestore
      const userRef = doc(db, 'users', newUser.uid);
      
      if (role === 'trainee' && coachDoc) {
        // For trainees - include coachId
        console.log('Saving trainee with coachId:', coachDoc.id);
        const traineeData: UserData = {
          uid: newUser.uid,
          email: newUser.email!,
          fullName,
          role: 'trainee',
          coachId: coachDoc.id,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        console.log('Trainee data to save:', traineeData);
        await setDoc(userRef, traineeData);
        
        // Verify the data was saved correctly
        const verifyDoc = await getDoc(userRef);
        const savedData = verifyDoc.data();
        console.log('Verification - saved trainee data:', savedData);
        
        if (!savedData?.coachId) {
          console.error('Failed to save coachId in trainee document');
          throw new Error('שגיאה בשמירת נתוני המתאמן');
        }
        
        if (savedData.coachId !== coachDoc.id) {
          console.error('Saved coachId does not match expected value');
          console.error('Expected:', coachDoc.id);
          console.error('Got:', savedData.coachId);
          throw new Error('שגיאה בשמירת נתוני המתאמן');
        }
        
        // Set user data in local state
        setUserData(savedData as UserData);
        
      } else if (role === 'coach') {
        // For coaches - generate and include invitation code
        const invitationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        console.log('Saving coach with invitation code:', invitationCode);
        const coachData: UserData = {
          uid: newUser.uid,
          email: newUser.email!,
          fullName,
          role: 'coach',
          invitationCode,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        console.log('Coach data to save:', coachData);
        await setDoc(userRef, coachData);
        
        // Verify the data was saved correctly
        const verifyDoc = await getDoc(userRef);
        const savedData = verifyDoc.data();
        console.log('Verification - saved coach data:', savedData);
        
        if (!savedData?.invitationCode) {
          console.error('Failed to save invitation code in coach document');
          throw new Error('שגיאה בשמירת נתוני המאמן');
        }
        
        // Set user data in local state
        setUserData(savedData as UserData);
      }

    } catch (error) {
      console.error('Error during signup:', error);
      throw error;
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await fetchUserData(userCredential.user.uid);
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    } finally {
      setLoading(false);
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