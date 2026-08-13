import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { AppNotification } from '@/types/notification';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: true,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  dismissNotification: async () => {},
  refreshNotifications: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .order('scheduled_for', { ascending: false })
        .limit(50);
      if (error) throw error;
      setNotifications((data ?? []) as AppNotification[]);
    } catch (e) {

    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refreshNotifications(); }, [refreshNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [user]);

  const dismissNotification = useCallback(async (id: string) => {
    await supabase.from('notifications').update({ is_dismissed: true }).eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, loading,
      markAsRead, markAllAsRead, dismissNotification, refreshNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
