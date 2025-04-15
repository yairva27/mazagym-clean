import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, Timestamp, serverTimestamp, FieldValue } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Layout } from '../../components/layout/Layout';
import AvatarSelection from '../../components/AvatarSelection';
import { UserData, UpdateUserData } from '../../types/user';

type UserRole = 'coach' | 'trainee';

interface FormData extends Omit<UserData, 'createdAt' | 'updatedAt' | 'role'> {
  createdAt: string;
  updatedAt: string;
  role: UserRole;
}

interface UpdateData extends Partial<Omit<UserData, 'createdAt' | 'updatedAt'>> {
  updatedAt?: FieldValue;
}

interface SettingsProps {
  userData: UserData;
  onUpdate: (data: UpdateUserData) => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ userData, onUpdate }) => {
  const navigate = useNavigate();
  const { refreshUserData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: userData.fullName,
    phoneNumber: userData.phoneNumber || userData.phone || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData({
      fullName: userData.fullName,
      phoneNumber: userData.phoneNumber || userData.phone || '',
    });
  }, [userData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updates: UpdateUserData = {
        updatedAt: new Date(),
      };

      if (formData.fullName !== userData.fullName) {
        updates.fullName = formData.fullName;
      }

      if (formData.phoneNumber !== (userData.phoneNumber || userData.phone)) {
        updates.phoneNumber = formData.phoneNumber;
        updates.phone = formData.phoneNumber; // For backward compatibility
      }

      await onUpdate(updates);
      setSuccess('ההגדרות עודכנו בהצלחה');
      setIsEditing(false);
    } catch (err) {
      setError('אירעה שגיאה בעדכון ההגדרות');
      console.error('Error updating settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!userData) {
    return (
      <Layout>
        <div className="text-center text-red-500">לא מורשה</div>
      </Layout>
    );
  }

  // Format dates for display
  const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return '';
    
    try {
      // Handle Firestore Timestamp
      if (date instanceof Timestamp) {
        return date.toDate().toLocaleString('he-IL');
      }
      
      // Handle Date object
      if (date instanceof Date) {
        return date.toLocaleString('he-IL');
      }
      
      // Handle string or number
      return new Date(date).toLocaleString('he-IL');
    } catch (err) {
      console.error('Error formatting date:', err);
      return 'תאריך לא תקין';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
          {/* Debug Info at the top for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-8 p-4 bg-gray-100 rounded">
              <h3 className="font-bold mb-2">Debug Info:</h3>
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify({
                  userData: {
                    ...userData,
                    createdAt: userData?.createdAt instanceof Timestamp ? 'Timestamp' : typeof userData?.createdAt,
                    updatedAt: userData?.updatedAt instanceof Timestamp ? 'Timestamp' : typeof userData?.updatedAt
                  },
                  formData
                }, null, 2)}
              </pre>
            </div>
          )}

          <h1 className="text-2xl font-bold text-center mb-8">הגדרות</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <div className="flex flex-col items-center mb-8">
            <img
              src={userData.avatar || '/assets/avatars/default.png'}
              alt={userData.fullName}
              className="w-32 h-32 rounded-full mb-4"
            />
            <button
              onClick={() => navigate('/settings/avatar')}
              className="text-primary hover:text-primary-dark"
            >
              שנה אווטאר
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col">
              <label className="text-gray-600 mb-2">שם מלא</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                disabled={!isEditing}
                className={`p-2 border rounded ${!isEditing ? 'bg-gray-100' : 'bg-white'}`}
                required
              />
            </div>

            <div className="flex flex-col">
              <label className="text-gray-600 mb-2">טלפון</label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={!isEditing}
                className={`p-2 border rounded ${!isEditing ? 'bg-gray-100' : 'bg-white'}`}
                dir="ltr"
                placeholder="הזן מספר טלפון"
              />
            </div>

            <div className="flex justify-end space-x-4 space-x-reverse">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        fullName: userData.fullName,
                        phoneNumber: userData.phoneNumber || userData.phone || '',
                      });
                      setError(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    disabled={isSaving}
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
                    disabled={isSaving}
                  >
                    {isSaving ? 'שומר...' : 'שמור'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(true);
                    setError(null);
                    setSuccess(null);
                  }}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                >
                  ערוך
                </button>
              )}
            </div>
          </form>

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <p>נוצר בתאריך: {formatDate(userData.createdAt)}</p>
              <p>עודכן בתאריך: {formatDate(userData.updatedAt)}</p>
              <p>תפקיד: {userData.role === 'coach' ? 'מאמן' : 'מתאמן'}</p>
              {userData.role === 'coach' && userData.invitationCode && (
                <p>קוד הזמנה: {userData.invitationCode}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings; 