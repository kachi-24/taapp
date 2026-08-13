import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { ThemeMode, AccentColor } from '@/types/theme';

export interface UserSettings {
  id?: string;
  theme_mode: ThemeMode;
  accent_color: AccentColor;
  reminder_minutes: number;
  alarm_sound: string;
  notification_sound: string;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  voice_language: string;
  biometric_enabled: boolean;
}

export interface SoundConfig {
  priority: 'high' | 'medium' | 'low';
  sound: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme_mode: 'system',
  accent_color: 'blue',
  reminder_minutes: 15,
  alarm_sound: 'default',
  notification_sound: 'default',
  quiet_hours_start: null,
  quiet_hours_end: null,
  voice_language: 'en-US',
  biometric_enabled: false,
};

interface SettingsContextType {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  updateSoundConfig: (config: SoundConfig) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  updateSettings: async () => {},
  updateSoundConfig: async () => {},
  resetSettings: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          theme_mode: (data.theme_mode as ThemeMode) ?? DEFAULT_SETTINGS.theme_mode,
          accent_color: (data.accent_color as AccentColor) ?? DEFAULT_SETTINGS.accent_color,
          reminder_minutes: data.reminder_minutes ?? DEFAULT_SETTINGS.reminder_minutes,
          alarm_sound: data.alarm_sound ?? DEFAULT_SETTINGS.alarm_sound,
          notification_sound: data.notification_sound ?? DEFAULT_SETTINGS.notification_sound,
          quiet_hours_start: data.quiet_hours_start ?? null,
          quiet_hours_end: data.quiet_hours_end ?? null,
          voice_language: data.voice_language ?? DEFAULT_SETTINGS.voice_language,
          biometric_enabled: data.biometric_enabled ?? DEFAULT_SETTINGS.biometric_enabled,
        });
      } else {
        // First launch — create default row
        await supabase.from('user_settings').insert({
          user_id: user.id,
          ...DEFAULT_SETTINGS,
        });
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (e) {

    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // BUG FIX: Added { onConflict: 'user_id' } so subsequent calls UPDATE rather than INSERT,
  // preventing duplicate key violations on the UNIQUE(user_id) constraint.
  const updateSettings = useCallback(async (updates: Partial<UserSettings>) => {
    if (!user) return;
    const merged = { ...settings, ...updates };
    setSettings(merged);
    await supabase.from('user_settings').upsert(
      {
        user_id: user.id,
        theme_mode: merged.theme_mode,
        accent_color: merged.accent_color,
        reminder_minutes: merged.reminder_minutes,
        alarm_sound: merged.alarm_sound,
        notification_sound: merged.notification_sound,
        quiet_hours_start: merged.quiet_hours_start,
        quiet_hours_end: merged.quiet_hours_end,
        voice_language: merged.voice_language,
        biometric_enabled: merged.biometric_enabled,
      },
      { onConflict: 'user_id' }  // ← THE FIX
    );
  }, [user, settings]);

  const updateSoundConfig = useCallback(async (config: SoundConfig) => {
    if (!user) return;
    const field = config.priority === 'high' ? 'alarm_sound' : 'notification_sound';
    await updateSettings({ [field]: config.sound });
  }, [user, updateSettings]);

  const resetSettings = useCallback(async () => {
    await updateSettings(DEFAULT_SETTINGS);
  }, [updateSettings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, updateSoundConfig, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
