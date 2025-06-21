
import { useState, useCallback } from 'react';
import { NotificationMessage, NotificationType } from '../../types';

export interface UseNotificationManagerOutput {
  notifications: NotificationMessage[];
  addNotification: (message: string, type: NotificationType, duration?: number) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationManager = (): UseNotificationManagerOutput => {
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType, duration: number = 5000) => {
    const newNotification: NotificationMessage = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      message,
      type,
      duration,
    };
    setNotifications(prev => [...prev, newNotification]);
    if (duration > 0) {
      setTimeout(() => {
        // Use functional update for setNotifications to ensure we're acting on the latest state
        setNotifications(currentNotifications => currentNotifications.filter(n => n.id !== newNotification.id));
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
  };
};
