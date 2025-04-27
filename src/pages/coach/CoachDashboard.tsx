console.log('=== CoachDashboard File Loaded ===');

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);

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

  useEffect(() => {
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

  const duplicateWorkoutPlan = async (sourceTraineeId: string, targetTraineeId: string) => {
    if (!userData?.uid) {
      throw new Error('User data not found');
    }

    try {
      console.log('=== Starting Workout Plan Duplication ===');
      console.log('Source traineeId:', sourceTraineeId);
      console.log('Target traineeId:', targetTraineeId);

      // 1. Get the source workout plan
      const workoutPlansRef = collection(db, 'workoutPlans');
      const sourcePlanQuery = query(
        workoutPlansRef,
        where('traineeId', '==', sourceTraineeId),
        where('isActive', '==', true)
      );
      const sourcePlanSnapshot = await getDocs(sourcePlanQuery);
      if (sourcePlanSnapshot.empty) {
        throw new Error('לא נמצאה תוכנית אימון פעילה למתאמן המקור');
      }
      const sourcePlanDoc = sourcePlanSnapshot.docs[0];
      const sourcePlanData = sourcePlanDoc.data() as WorkoutPlan;
      console.log('Source plan found:', { planId: sourcePlanDoc.id });

      // 2. Delete any existing active plans for the target trainee
      const existingPlansQuery = query(
        workoutPlansRef,
        where('traineeId', '==', targetTraineeId),
        where('isActive', '==', true)
      );
      const existingPlansSnapshot = await getDocs(existingPlansQuery);
      const batch = writeBatch(db);
      existingPlansSnapshot.docs.forEach(doc => {
        console.log('Deleting existing plan:', doc.id);
        batch.delete(doc.ref);
      });

      // 3. Create a new plan for the target trainee
      const newPlanRef = doc(workoutPlansRef);
      const now = Timestamp.now();
      const newPlan: WorkoutPlan = {
        id: newPlanRef.id,
        workoutPlanName: sourcePlanData.workoutPlanName || sourcePlanData.name || 'תוכנית אימון',
        name: sourcePlanData.name || sourcePlanData.workoutPlanName || 'תוכנית אימון',
        description: sourcePlanData.description || '',
        traineeId: targetTraineeId,
        coachId: userData.uid,
        createdAt: now,
        updatedAt: now,
        isActive: true,
        days: (sourcePlanData.days || []).map(day => ({
          id: uuidv4(),
          name: day.name || '',
          notes: day.notes || '',
          exercises: (day.exercises || []).map(exercise => ({
            id: uuidv4(),
            name: exercise.name || '',
            sets: Number(exercise.sets) || 1,
            reps: String(exercise.reps || '0'),
            weight: Number(exercise.weight) || 0,
            notes: exercise.notes || '',
            restTime: Number(exercise.restTime) || 60,
            completed: false,
            completedAt: null,
            actualWeight: 0,
            actualReps: 0,
            weightHistory: []
          }))
        }))
      };
      console.log('Creating new plan:', {
        planId: newPlanRef.id,
        traineeId: targetTraineeId,
        isActive: true
      });
      batch.set(newPlanRef, newPlan);

      // 4. Update the trainee's user document
      const traineeRef = doc(db, 'users', targetTraineeId);
      const traineeUpdate = {
        planId: newPlanRef.id,
        workoutPlanId: newPlanRef.id,
        updatedAt: now
      };
      console.log('Updating trainee document:', traineeUpdate);
      batch.update(traineeRef, traineeUpdate);

      // 5. Commit all changes atomically
      await batch.commit();
      console.log('Batch committed successfully');

      // 6. Verify the new plan was created correctly
      const verificationQuery = query(
        workoutPlansRef,
        where('traineeId', '==', targetTraineeId),
        where('isActive', '==', true)
      );
      const verificationSnapshot = await getDocs(verificationQuery);
      if (verificationSnapshot.empty) {
        console.error('Verification failed: No active plan found for target trainee after duplication');
        throw new Error('שגיאה באימות תוכנית האימון החדשה');
      }
      const verifiedPlan = verificationSnapshot.docs[0].data();
      console.log('Verification successful:', {
        planId: verifiedPlan.id,
        traineeId: verifiedPlan.traineeId,
        isActive: verifiedPlan.isActive
      });

      return newPlanRef.id;
    } catch (error) {
      console.error('Error in duplicateWorkoutPlan:', error);
      throw error instanceof Error ? error : new Error('שגיאה בשכפול תוכנית האימון');
    }
  };

  const handleDuplicateWorkoutPlan = async () => {
    if (!sourceTraineeId || !targetTraineeId) {
      showNotification?.('יש לבחור מתאמן מקור ומתאמן יעד', 'error');
      return;
    }

    setDuplicating(true);
    try {
      const sourceTrainee = trainees.find(t => t.uid === sourceTraineeId);
      const targetTrainee = trainees.find(t => t.uid === targetTraineeId);

      if (!sourceTrainee || !targetTrainee) {
        showNotification?.('לא נמצאו פרטי המתאמנים', 'error');
        return;
      }

      const newPlanId = await duplicateWorkoutPlan(sourceTraineeId, targetTraineeId);
      if (newPlanId) {
        showNotification?.('תוכנית האימון הועתקה בהצלחה', 'success');
        setShowDuplicateModal(false);
        setShowConfirmModal(false);
        setSourceTraineeId(null);
        setTargetTraineeId(null);
        
        // Force refresh the trainees list to show updated plans
        await fetchTrainees();
      }
    } catch (error) {
      console.error('Error duplicating workout plan:', error);
      showNotification?.('שגיאה בהעתקת תוכנית האימון', 'error');
    } finally {
      setDuplicating(false);
    }
  };

  const handleConfirmDuplicate = () => {
    setShowConfirmModal(true);
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
        
        {/* Add Invitation Code Display */}
        {userData?.invitationCode && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">קוד הזמנה למתאמנים</h2>
                <p className="text-sm text-gray-500">שתף את הקוד עם המתאמנים שלך כדי שיוכלו להירשם למערכת</p>
              </div>
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="bg-blue-50 px-4 py-2 rounded-md border border-blue-200">
                  <span className="font-mono text-lg font-semibold text-blue-700">{userData.invitationCode}</span>
                </div>
                <button
                  onClick={() => {
                    if (userData?.invitationCode) {
                      navigator.clipboard.writeText(userData.invitationCode);
                    }
                  }}
                  className="bg-blue-100 p-2 rounded-md hover:bg-blue-200 transition-colors"
                  title="העתק קוד"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        
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
                <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-200 shadow-md inline-block">
                  <p className="text-sm text-gray-600 mb-2">הקוד שלך:</p>
                  <div className="bg-white p-3 rounded border border-blue-300 shadow-inner">
                    <span className="font-mono text-2xl text-blue-700 font-bold tracking-wider">
                      {userData.invitationCode}
                    </span>
                  </div>
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

      {/* Duplicate Plan Selection Modal */}
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
                onClick={() => {
                  setShowDuplicateModal(false);
                  setSourceTraineeId(null);
                  setTargetTraineeId(null);
                }}
                disabled={duplicating}
              >
                ביטול
              </button>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                onClick={handleConfirmDuplicate}
                disabled={!targetTraineeId || duplicating}
              >
                המשך
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">האם אתה בטוח שברצונך לשכפל את התוכנית?</h3>
            <p className="mb-6 text-gray-600">
              פעולה זו תחליף את התוכנית הקיימת של המתאמן הנבחר, אם קיימת.
            </p>
            
            <div className="flex justify-end space-x-3 space-x-reverse">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                onClick={() => setShowConfirmModal(false)}
                disabled={duplicating}
              >
                ביטול
              </button>
              <button
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                onClick={handleDuplicateWorkoutPlan}
                disabled={duplicating}
              >
                {duplicating ? 'משכפל...' : 'אישור'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default CoachDashboard; 