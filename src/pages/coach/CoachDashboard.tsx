console.log('=== CoachDashboard File Loaded ===');

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { UserData } from '../../types/user';
import { useNotification } from '../../contexts/NotificationContext';
import { WorkoutPlan } from '../../types/workout';
import { v4 as uuidv4 } from 'uuid';

interface TraineeWithWorkout extends UserData {
  lastWorkoutUpdate?: Date;
  workoutPlanId?: string;
}

export const CoachDashboard: React.FC = () => {
  const { userData } = useAuth();
  const { showNotification, showConfirmation } = useNotification();
  const [trainees, setTrainees] = useState<TraineeWithWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [sourceTraineeId, setSourceTraineeId] = useState<string | null>(null);
  const [targetTraineeId, setTargetTraineeId] = useState<string | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  useEffect(() => {
    const fetchTrainees = async () => {
      try {
        // Validate auth data
        console.log('=== Auth Data Validation ===');
        console.log('Current userData:', {
          uid: userData?.uid,
          role: userData?.role,
          exists: !!userData
        });

        if (!userData?.uid) {
          console.error('No userData.uid available');
          setError('שגיאה בטעינת נתוני משתמש');
          setLoading(false);
          return;
        }

        // Build and execute query
        console.log('=== Query Execution ===');
        console.log('Building query with params:', {
          coachId: userData.uid,
          role: 'trainee'
        });

        const usersRef = collection(db, 'users');
        console.log('Collection reference:', usersRef.path);

        const traineesQuery = query(
          usersRef,
          where('coachId', '==', userData.uid),
          where('role', '==', 'trainee')
        );

        console.log('Executing query...');
        const querySnapshot = await getDocs(traineesQuery);

        // Log raw query results
        console.log('=== Raw Query Results ===');
        console.log('QuerySnapshot:', {
          empty: querySnapshot.empty,
          size: querySnapshot.size,
          docs: querySnapshot.docs.map(doc => ({
            id: doc.id,
            exists: doc.exists(),
            data: doc.data()
          }))
        });

        if (querySnapshot.empty) {
          console.log('Query returned empty result');
          setTrainees([]);
          setLoading(false);
          return;
        }

        // Process and validate each trainee document
        console.log('=== Processing Trainees ===');
        const processedTrainees = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Processing document:', {
            id: doc.id,
            rawData: data
          });

          const trainee = {
            uid: doc.id,
            email: data.email || '',
            fullName: data.fullName || '',
            role: data.role || 'trainee',
            coachId: data.coachId || '',
            phoneNumber: data.phoneNumber || data.phone || '',
            avatar: data.avatar || '',
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as TraineeWithWorkout;

          console.log('Processed trainee:', trainee);
          return trainee;
        });

        console.log('=== Final State Update ===');
        console.log('Setting trainees state with:', processedTrainees);
        setTrainees(processedTrainees);

      } catch (err) {
        console.error('Error in fetchTrainees:', err);
        setError('שגיאה בטעינת המתאמנים');
      } finally {
        setLoading(false);
      }
    };

    fetchTrainees();
  }, [userData?.uid]);

  // Debug render state
  console.log('=== Render State ===', {
    loading,
    error,
    traineesCount: trainees.length,
    trainees: trainees
  });

  const handleDuplicateClick = (traineeId: string) => {
    setSourceTraineeId(traineeId);
    setShowDuplicateModal(true);
  };

  const handleDuplicateConfirm = async () => {
    if (!sourceTraineeId || !targetTraineeId || !userData?.uid) return;
    
    setDuplicating(true);
    try {
      // Get the active workout plan for the source trainee
      const workoutPlansRef = collection(db, 'workoutPlans');
      const q = query(
        workoutPlansRef,
        where('traineeId', '==', sourceTraineeId),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        showNotification('לא נמצאה תוכנית אימון פעילה למתאמן המקור', 'error');
        return;
      }
      
      const sourcePlanDoc = querySnapshot.docs[0];
      const sourcePlanData = sourcePlanDoc.data() as WorkoutPlan;
      
      // Create a new workout plan for the target trainee
      const newPlanRef = doc(collection(db, 'workoutPlans'));
      const now = Timestamp.now();
      
      // Deep clone the plan, resetting completion flags and actual weights
      const newPlan = {
        ...sourcePlanData,
        id: newPlanRef.id,
        traineeId: targetTraineeId,
        coachId: userData.uid,
        createdAt: now,
        updatedAt: now,
        isActive: true,
        days: sourcePlanData.days.map(day => ({
          ...day,
          id: uuidv4(),
          exercises: day.exercises.map(exercise => ({
            ...exercise,
            id: uuidv4(),
            actualWeight: undefined,
            actualReps: undefined,
            completed: false,
            completedAt: null,
            weightHistory: []
          }))
        }))
      };
      
      // Save the new plan to Firestore
      await setDoc(newPlanRef, newPlan);
      
      // Deactivate any existing active plan for the target trainee
      const existingPlansQuery = query(
        workoutPlansRef,
        where('traineeId', '==', targetTraineeId),
        where('isActive', '==', true)
      );
      
      const existingPlansSnapshot = await getDocs(existingPlansQuery);
      
      // Deactivate existing plans
      const deactivationPromises = existingPlansSnapshot.docs.map(doc => 
        updateDoc(doc.ref, { isActive: false })
      );
      
      await Promise.all(deactivationPromises);
      
      showNotification('התוכנית שוכפלה בהצלחה', 'success');
      setShowDuplicateModal(false);
      
      // Reload the page to refresh the trainees list
      window.location.reload();
    } catch (error) {
      console.error('Error duplicating workout plan:', error);
      showNotification('שגיאה בשכפול תוכנית האימון', 'error');
    } finally {
      setDuplicating(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4">טוען מתאמנים...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">לוח בקרה למאמן</h1>
        
        {error ? (
          <div className="bg-red-50 p-4 rounded-lg text-red-700 mb-6">
            {error}
          </div>
        ) : trainees.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-medium mb-4">אין לך מתאמנים כרגע</h3>
              <p className="text-gray-600 mb-6">
                שתף את קוד ההזמנה שלך כדי שמתאמנים יוכלו להירשם למערכת
              </p>
              {userData?.invitationCode && (
                <div className="bg-blue-50 p-4 rounded-lg inline-block">
                  <p className="text-sm text-gray-600 mb-2">הקוד שלך:</p>
                  <span className="font-mono text-lg text-blue-700 font-semibold">
                    {userData.invitationCode}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trainees.map((trainee) => (
              <div key={trainee.uid} className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center mb-6">
                    <img
                      src={trainee.avatar || '/assets/avatars/default.png'}
                      alt={trainee.fullName}
                      className="w-16 h-16 rounded-full mr-4 object-cover border-2 border-gray-100"
                    />
                    <div>
                      <h3 className="font-medium text-lg">{trainee.fullName}</h3>
                      <p className="text-gray-600">{trainee.email}</p>
                      {trainee.phoneNumber && (
                        <p className="text-gray-600 text-sm">{trainee.phoneNumber}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Link
                      to={`/coach/trainee/${trainee.uid}/workout`}
                      className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      צפה בתוכנית אימון
                    </Link>
                    <Link
                      to={`/coach/trainee/${trainee.uid}/create-plan`}
                      className="block w-full text-center bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      צור תוכנית אימון חדשה
                    </Link>
                    <Link
                      to={`/coach/trainee/${trainee.uid}/edit-plan`}
                      className="block w-full text-center bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
                    >
                      ערוך תוכנית אימון
                    </Link>
                    <button
                      onClick={() => handleDuplicateClick(trainee.uid)}
                      className="block w-full text-center bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      שכפל תוכנית
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duplicate Plan Modal */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">שכפול תוכנית אימון</h3>
            <p className="mb-4">בחר מתאמן אליו תרצה לשכפל את התוכנית:</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                מתאמן יעד
              </label>
              <select
                className="w-full p-2 border rounded"
                value={targetTraineeId || ''}
                onChange={(e) => setTargetTraineeId(e.target.value)}
                disabled={duplicating}
              >
                <option value="">בחר מתאמן</option>
                {trainees
                  .filter(t => t.uid !== sourceTraineeId)
                  .map(trainee => (
                    <option key={trainee.uid} value={trainee.uid}>
                      {trainee.fullName}
                    </option>
                  ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                onClick={() => setShowDuplicateModal(false)}
                disabled={duplicating}
              >
                ביטול
              </button>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                onClick={handleDuplicateConfirm}
                disabled={!targetTraineeId || duplicating}
              >
                {duplicating ? 'משכפל...' : 'שכפל'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CoachDashboard; 