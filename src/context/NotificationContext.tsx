import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { dbService } from '../services/db';
import { AppNotification, NotificationPreferences } from '../types';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  pushPermissionStatus: NotificationPermission | 'unsupported';
  updatePreferences: (prefs: NotificationPreferences) => Promise<void>;
  preferences: NotificationPreferences;
}

const defaultPreferences: NotificationPreferences = {
  orderUpdates: true,
  sellerNewOrders: true,
  promotions: true,
  pushEnabled: true,
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    currentUser?.notificationPreferences || defaultPreferences
  );
  const [pushPermissionStatus, setPushPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermissionStatus(Notification.permission);
    } else {
      setPushPermissionStatus('unsupported');
    }
  }, []);

  const refreshNotifications = async () => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }
    const notifs = await dbService.getNotifications(currentUser.id);
    setNotifications(notifs);
    if (currentUser.notificationPreferences) {
      setPreferences(currentUser.notificationPreferences);
    }
  };

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 8000);
    return () => clearInterval(interval);
  }, [currentUser?.id]);

  const markAsRead = async (id: string) => {
    await dbService.markNotificationAsRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!currentUser) return;
    await dbService.markAllNotificationsAsRead(currentUser.id);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const requestPushPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      setPushPermissionStatus(permission);
      if (permission === 'granted') {
        new Notification('SwiftCart Notifications Active', {
          body: 'You will receive real-time Ugandan delivery & order updates!',
          icon: '/favicon.ico',
        });
        if (currentUser) {
          await updatePreferences({ ...preferences, pushEnabled: true });
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updatePreferences = async (newPrefs: NotificationPreferences) => {
    setPreferences(newPrefs);
    if (currentUser) {
      await dbService.updateNotificationPreferences(currentUser.id, newPrefs);
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        setIsOpen,
        markAsRead,
        markAllAsRead,
        refreshNotifications,
        requestPushPermission,
        pushPermissionStatus,
        updatePreferences,
        preferences,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
