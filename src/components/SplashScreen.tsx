import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import splashLogo from '@/assets/avatars/splash/splashLogo.png';
import '../styles/splash.css';

export const SplashScreen: React.FC = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();

  useEffect(() => {
    // After 3 seconds, navigate to the appropriate dashboard based on user role
    const timer = setTimeout(() => {
      if (!userData) {
        navigate('/login');
      } else if (userData.role === 'coach') {
        navigate('/coach/dashboard');
      } else {
        navigate('/trainee/dashboard');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, userData]);

  return (
    <div className="splash-screen">
      {/* Animated background waves */}
      <div className="splash-waves">
        <div className="wave wave1"></div>
        <div className="wave wave2"></div>
        <div className="wave wave3"></div>
      </div>
      
      {/* Soft pulses */}
      <div className="pulse-container">
        <div className="pulse pulse1"></div>
        <div className="pulse pulse2"></div>
        <div className="pulse pulse3"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-8 md:gap-12 p-4">
        <img 
          src={splashLogo}
          alt="MazaGym Logo" 
          className="w-44 h-44 md:w-64 md:h-64 object-contain splash-logo"
        />
        <p className="splash-text text-white text-center text-lg md:text-xl font-medium max-w-sm">
          MazaGym – מתכוננים לאימון שלך...
        </p>
      </div>
    </div>
  );
};

export default SplashScreen; 