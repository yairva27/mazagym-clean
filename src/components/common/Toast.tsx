import React, { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export type NotificationType = 'success' | 'error' | 'info';

export interface ToastProps {
  message: string;
  type: NotificationType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const icons = {
    success: <CheckCircleIcon className="h-5 w-5 text-green-400" />,
    error: <XCircleIcon className="h-5 w-5 text-red-400" />,
    info: <InformationCircleIcon className="h-5 w-5 text-blue-400" />,
  };

  const backgrounds = {
    success: 'bg-green-50',
    error: 'bg-red-50',
    info: 'bg-blue-50',
  };

  const borders = {
    success: 'border-green-200',
    error: 'border-red-200',
    info: 'border-blue-200',
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`${backgrounds[type]} ${borders[type]} border rounded-lg p-4 shadow-lg flex items-center gap-3 min-w-[300px] max-w-md`}
      >
        {icons[type]}
        <p className="text-sm text-gray-700 flex-1">{message}</p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}; 