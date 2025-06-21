
import React from 'react';
import { NotificationMessage, NotificationType } from '../../types';
import { XMarkIcon } from '../icons/XMarkIcon'; // Assuming you have an XMarkIcon
import { vscodeDarkTheme } from '../../theme/vscodeDark';

interface GlobalNotificationDisplayProps {
  notifications: NotificationMessage[];
  onDismiss: (id: string) => void;
}

const getNotificationStyles = (type: NotificationType) => {
  switch (type) {
    case NotificationType.Error:
      return `bg-red-700 text-red-100 border-red-500`;
    case NotificationType.Warning:
      return `bg-yellow-600 text-yellow-100 border-yellow-400`;
    case NotificationType.Info:
      return `bg-blue-700 text-blue-100 border-blue-500`;
    case NotificationType.Success:
      return `bg-green-700 text-green-100 border-green-500`;
    default:
      return `bg-zinc-700 text-zinc-100 border-zinc-500`;
  }
};

export const GlobalNotificationDisplay: React.FC<GlobalNotificationDisplayProps> = ({ notifications, onDismiss }) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-auto max-w-md md:max-w-lg lg:max-w-xl z-[200] space-y-2 pointer-events-none"
      aria-live="assertive"
      role="alert"
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`relative flex items-center justify-between p-3 pr-10 rounded-md shadow-lg border text-sm pointer-events-auto animate-fadeIn ${getNotificationStyles(notification.type)}`}
        >
          <span className="flex-grow">{notification.message}</span>
          <button
            onClick={() => onDismiss(notification.id)}
            className={`absolute top-1/2 right-2 transform -translate-y-1/2 p-1 rounded-md hover:bg-black hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50`}
            aria-label="Dismiss notification"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};
