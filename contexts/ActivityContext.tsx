import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { useSettings } from './SettingsContext';
import { Activity, ActivityException, AttendanceRecord, AttendanceStatus } from '@/types/activity';
import { rescheduleAllReminders, scheduleActivityReminder, cancelActivityReminder } from '@/services/notificationService';

interface ActivityContextType {
  activities: Activity[];
  loading: boolean;
  addActivity: (activity: Omit<Activity, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<Activity | null>;
  updateActivity: (id: string, updates: Partial<Activity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  refreshActivities: () => Promise<void>;
  addException: (exception: Omit<ActivityException, 'id' | 'created_at'>) => Promise<void>;
  getExceptions: (activityId: string) => ActivityException[];
  recordAttendance: (record: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  getAttendance: (activityId: string) => AttendanceRecord[];
  exceptions: ActivityException[];
  attendanceRecords: AttendanceRecord[];
}

const ActivityContext = createContext<ActivityContextType>({
  activities: [],
  loading: true,
  addActivity: async () => null,
  updateActivity: async () => {},
  deleteActivity: async () => {},
  refreshActivities: async () => {},
  addException: async () => {},
  getExceptions: () => [],
  recordAttendance: async () => {},
  getAttendance: () => [],
  exceptions: [],
  attendanceRecords: [],
});

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { settings } = useSettings();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [exceptions, setExceptions] = useState<ActivityException[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshActivities = useCallback(async () => {
    if (!user) { setActivities([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });
      if (error) throw error;
      setActivities((data ?? []) as Activity[]);

      const ids = (data ?? []).map((a) => a.id);
      if (ids.length > 0) {
        const [excResult, attResult] = await Promise.all([
          supabase.from('activity_exceptions').select('*').in('activity_id', ids),
          supabase.from('attendance_records').select('*').eq('user_id', user.id).in('activity_id', ids),
        ]);
        setExceptions((excResult.data ?? []) as ActivityException[]);
        setAttendanceRecords((attResult.data ?? []) as AttendanceRecord[]);
      }
    } catch (e) {

    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refreshActivities(); }, [refreshActivities]);

  // Reschedule all reminders whenever activities or reminder settings change
  useEffect(() => {
    if (!user || activities.length === 0) return;
    rescheduleAllReminders(activities, settings.reminder_minutes, settings.notification_sound, settings.voice_language);
  }, [user, activities, settings.reminder_minutes, settings.notification_sound, settings.voice_language]);

  const addActivity = useCallback(async (activity: Omit<Activity, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('activities').insert({
      ...activity,
      user_id: user.id,
    }).select().single();
    if (error) { return null; }
    const newActivity = data as Activity;
    setActivities(prev => [...prev, newActivity].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    ));
    // Schedule reminder for the new activity
    if (newActivity.reminder_minutes > 0 && new Date(newActivity.start_time) > new Date()) {
      scheduleActivityReminder(newActivity, newActivity.reminder_minutes, settings.notification_sound, settings.voice_language);
    }
    return newActivity;
  }, [user, settings.notification_sound, settings.voice_language]);

  const updateActivity = useCallback(async (id: string, updates: Partial<Activity>) => {
    const { error } = await supabase.from('activities').update(updates).eq('id', id);
    if (error) { return; }
    setActivities(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    // Reschedule reminder for this activity
    const updated = activities.find(a => a.id === id);
    if (updated) {
      const merged = { ...updated, ...updates };
      cancelActivityReminder(id);
      if (merged.reminder_minutes > 0 && new Date(merged.start_time) > new Date()) {
        scheduleActivityReminder(merged, merged.reminder_minutes, settings.notification_sound, settings.voice_language);
      }
    }
  }, [activities, settings.notification_sound, settings.voice_language]);

  const deleteActivity = useCallback(async (id: string) => {
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) { return; }
    cancelActivityReminder(id);
    setActivities(prev => prev.filter(a => a.id !== id));
  }, []);

  const addException = useCallback(async (exception: Omit<ActivityException, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('activity_exceptions').upsert(exception, {
      onConflict: 'activity_id,exception_date',
    }).select().single();
    if (error) { return; }
    setExceptions(prev => {
      const filtered = prev.filter(e => !(e.activity_id === exception.activity_id && e.exception_date === exception.exception_date));
      return [...filtered, data as ActivityException];
    });
  }, []);

  const getExceptions = useCallback((activityId: string) => {
    return exceptions.filter(e => e.activity_id === activityId);
  }, [exceptions]);

  const recordAttendance = useCallback(async (record: Omit<AttendanceRecord, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase.from('attendance_records').upsert(record, {
      onConflict: 'activity_id,date',
    }).select().single();
    if (error) { return; }
    setAttendanceRecords(prev => {
      const filtered = prev.filter(r => !(r.activity_id === record.activity_id && r.date === record.date));
      return [...filtered, data as AttendanceRecord];
    });
  }, []);

  const getAttendance = useCallback((activityId: string) => {
    return attendanceRecords.filter(r => r.activity_id === activityId);
  }, [attendanceRecords]);

  return (
    <ActivityContext.Provider value={{
      activities, loading, addActivity, updateActivity, deleteActivity,
      refreshActivities, addException, getExceptions, exceptions,
      recordAttendance, getAttendance, attendanceRecords,
    }}>
      {children}
    </ActivityContext.Provider>
  );
}

export const useActivities = () => useContext(ActivityContext);
