import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast } from '../components/common/Toast';
import { ConfirmationModal } from '../components/common/ConfirmationModal';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  isVisible: boolean;
}

interface NotificationContextType {
  showNotification: (message: string, type: NotificationType, duration?: number) => void;
  showConfirmation: (title: string, message: string, onConfirm: () => void, type?: 'warning' | 'danger' | 'info') => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'warning' | 'danger' | 'info';
  } | null>(null);

  const showNotification = useCallback((message: string, type: NotificationType, duration = 3000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, message, type, isVisible: true }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((notification) => notification.id !== id));
    }, duration);
  }, []);

  const showConfirmation = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'warning' | 'danger' | 'info' = 'warning'
  ) => {
    setConfirmation({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmation(null);
      },
      type,
    });
  }, []);

  const handleCloseNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.map(notification => 
      notification.id === id ? { ...notification, isVisible: false } : notification
    ));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, showConfirmation }}>
      {children}
      <div className="fixed bottom-0 right-0 z-50 m-4 flex flex-col gap-2">
        {notifications.map((notification) => (
          <Toast
            key={notification.id}
            message={notification.message}
            type={notification.type}
            isVisible={notification.isVisible}
            onClose={() => handleCloseNotification(notification.id)}
          />
        ))}
      </div>
      {confirmation && (
        <ConfirmationModal
          isOpen={confirmation.isOpen}
          title={confirmation.title}
          message={confirmation.message}
          onConfirm={confirmation.onConfirm}
          onCancel={() => setConfirmation(null)}
          type={confirmation.type}
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}; 