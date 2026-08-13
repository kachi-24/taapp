import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export interface ScheduleProfile {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ScheduleProfilesContextType {
  profiles: ScheduleProfile[];
  activeProfile: ScheduleProfile | null;
  loading: boolean;
  addProfile: (profile: Omit<ScheduleProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<ScheduleProfile | null>;
  updateProfile: (id: string, updates: Partial<ScheduleProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  setActiveProfile: (id: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
}

const ScheduleProfilesContext = createContext<ScheduleProfilesContextType>({
  profiles: [],
  activeProfile: null,
  loading: true,
  addProfile: async () => null,
  updateProfile: async () => {},
  deleteProfile: async () => {},
  setActiveProfile: async () => {},
  refreshProfiles: async () => {},
});

export function ScheduleProfilesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ScheduleProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProfiles = useCallback(async () => {
    if (!user) { setProfiles([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('schedule_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setProfiles((data ?? []) as ScheduleProfile[]);
    } catch (e) {

    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refreshProfiles(); }, [refreshProfiles]);

  const addProfile = useCallback(async (profile: Omit<ScheduleProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('schedule_profiles').insert({
      ...profile,
      user_id: user.id,
    }).select().single();
    if (error) { return null; }
    const newProfile = data as ScheduleProfile;
    setProfiles(prev => [...prev, newProfile]);
    return newProfile;
  }, [user]);

  const updateProfile = useCallback(async (id: string, updates: Partial<ScheduleProfile>) => {
    const { error } = await supabase.from('schedule_profiles').update(updates).eq('id', id);
    if (error) return;
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  const deleteProfile = useCallback(async (id: string) => {
    const { error } = await supabase.from('schedule_profiles').delete().eq('id', id);
    if (error) return;
    setProfiles(prev => prev.filter(p => p.id !== id));
  }, []);

  const setActiveProfile = useCallback(async (id: string) => {
    if (!user) return;
    // Deactivate all, then activate selected
    await supabase.from('schedule_profiles').update({ is_active: false }).eq('user_id', user.id);
    await supabase.from('schedule_profiles').update({ is_active: true }).eq('id', id);
    setProfiles(prev => prev.map(p => ({ ...p, is_active: p.id === id })));
  }, [user]);

  const activeProfile = profiles.find(p => p.is_active) ?? null;

  return (
    <ScheduleProfilesContext.Provider value={{
      profiles, activeProfile, loading,
      addProfile, updateProfile, deleteProfile, setActiveProfile, refreshProfiles,
    }}>
      {children}
    </ScheduleProfilesContext.Provider>
  );
}

export const useScheduleProfiles = () => useContext(ScheduleProfilesContext);
