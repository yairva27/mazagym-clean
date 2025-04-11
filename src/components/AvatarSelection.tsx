import React from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// Create an array of avatar paths
const AVATARS = Array.from({ length: 12 }, (_, i) => `/src/assets/avatars/avatar${i + 1}.png`);

interface AvatarSelectionProps {
  onSelect?: () => void;
}

const AvatarSelection: React.FC<AvatarSelectionProps> = ({ onSelect }) => {
  const { userData, refreshUserData } = useAuth();
  const navigate = useNavigate();

  const handleAvatarSelect = async (avatarUrl: string) => {
    if (!userData?.uid) return;

    try {
      const userRef = doc(db, 'users', userData.uid);
      await updateDoc(userRef, {
        avatar: avatarUrl,
      });
      await refreshUserData();
      
      // Call the onSelect callback if provided
      if (onSelect) {
        onSelect();
      } else {
        // Default navigation based on user role
        if (userData.role === 'coach') {
          navigate('/coach/dashboard');
        } else {
          navigate('/trainee/dashboard');
        }
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-center mb-8">בחר אווטאר</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {AVATARS.map((avatar, index) => (
          <button
            key={index}
            onClick={() => handleAvatarSelect(avatar)}
            className={`p-4 rounded-lg transition-all ${
              userData?.avatar === avatar
                ? 'ring-2 ring-blue-500 bg-blue-50'
                : 'hover:bg-gray-100'
            }`}
          >
            <img
              src={avatar}
              alt={`Avatar ${index + 1}`}
              className="w-full h-auto rounded-full"
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement;
                target.src = '/src/assets/avatars/avatar1.png';
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default AvatarSelection; 