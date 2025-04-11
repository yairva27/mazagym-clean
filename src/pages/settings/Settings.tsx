import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Layout } from '../../components/layout/Layout';
import AvatarSelection from '../../components/AvatarSelection';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { userData, refreshUserData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: userData?.fullName || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    phoneNumber: userData?.phoneNumber || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.uid) return;

    try {
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, {
        ...formData,
        updatedAt: new Date(),
      });
      await refreshUserData();
      setSuccess('הפרטים עודכנו בהצלחה');
      setIsEditing(false);
    } catch (err) {
      setError('שגיאה בעדכון הפרטים');
      console.error('Error updating profile:', err);
    }
  };

  if (!userData) {
    return (
      <Layout>
        <div className="text-center text-red-500">לא מורשה</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
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
                onChange={handleInputChange}
                disabled={!isEditing}
                className="p-2 border rounded"
                required
              />
            </div>

            <div className="flex flex-col">
              <label className="text-gray-600 mb-2">אימייל</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!isEditing}
                className="p-2 border rounded"
                required
              />
            </div>

            {userData.role === 'coach' && (
              <div className="flex flex-col">
                <label className="text-gray-600 mb-2">טלפון</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className="p-2 border rounded"
                />
              </div>
            )}

            <div className="flex justify-end space-x-4">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                  >
                    שמור
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark"
                >
                  ערוך
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default Settings; 