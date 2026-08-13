import React, { useEffect, useRef, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '@/contexts/SettingsContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { ActivityProvider } from '@/contexts/ActivityContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ScheduleProfilesProvider } from '@/contexts/ScheduleProfilesContext';
import {
  setAlarmFiredCallback,
  setNotificationTapCallback,
  requestNotificationPermissions,
} from '@/services/notificationService';
import { startGradualAlarm, stopGradualAlarm, stopAlarmAudio } from '@/services/alarmAudioService';
import { announceThenAlarm, stopAnnouncement, clearAnnounced, resetAllAnnouncements } from '@/services/ttsReminderService';
import AlarmModal from '@/components/AlarmModal';
import { Activity } from '@/types/activity';

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function InnerApp() {
  const { settings } = useSettings();
  const [alarmActivity, setAlarmActivity] = useState<Activity | null>(null);
  const [alarmVolume, setAlarmVolume] = useState(0);
  const snoozeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Request notification permissions on mount
    requestNotificationPermissions();

    // Register alarm callback — TTS announcement first, then alarm sound
    setAlarmFiredCallback((activity: Activity) => {
      setAlarmActivity(activity);
      setAlarmVolume(0);
      // Speak the announcement, then start the gradual alarm sound after TTS ends.
      // This prevents overlap between speech and alarm sound.
      announceThenAlarm(
        activity,
        settings.alarm_sound,
        () => {
          // This callback runs after TTS ends (or immediately if TTS unsupported)
          startGradualAlarm(activity.id, settings.alarm_sound, (vol) => setAlarmVolume(vol));
        },
        { language: settings.voice_language }
      );
    });

    // Register notification tap callback — deep-link to schedule tab
    setNotificationTapCallback(() => {
      router.push('/(tabs)/schedule');
    });

    return () => {
      setAlarmFiredCallback(null);
      setNotificationTapCallback(null);
      stopAlarmAudio();
      stopAnnouncement();
      resetAllAnnouncements();
    };
  }, [settings.alarm_sound, settings.voice_language]);

  const handleDismiss = () => {
    if (alarmActivity) stopGradualAlarm(alarmActivity.id);
    stopAnnouncement();
    setAlarmActivity(null);
    setAlarmVolume(0);
    if (snoozeTimerRef.current !== null) {
      window.clearTimeout(snoozeTimerRef.current);
      snoozeTimerRef.current = null;
    }
  };

  const handleSnooze = () => {
    if (!alarmActivity) return;
    const snoozed = alarmActivity;
    const snoozedId = snoozed.id;
    stopGradualAlarm(snoozedId);
    stopAnnouncement();
    // Clear the announced flag so the snooze re-announces when it re-fires
    clearAnnounced(snoozedId);
    setAlarmActivity(null);
    setAlarmVolume(0);
    snoozeTimerRef.current = window.setTimeout(() => {
      setAlarmActivity(snoozed);
      setAlarmVolume(0);
      announceThenAlarm(
        snoozed,
        settings.alarm_sound,
        () => {
          startGradualAlarm(snoozedId, settings.alarm_sound, (vol) => setAlarmVolume(vol));
        },
        { language: settings.voice_language }
      );
      snoozeTimerRef.current = null;
    }, 5 * 60 * 1000);
  };

  return (
    <ThemeProvider themeMode={settings.theme_mode} accentColor={settings.accent_color}>
      <ThemedStatusBar />
      <ActivityProvider>
        <NotificationProvider>
          <ScheduleProfilesProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <AlarmModal
              visible={alarmActivity !== null}
              activity={alarmActivity}
              volume={alarmVolume}
              onDismiss={handleDismiss}
              onSnooze={handleSnooze}
            />
          </ScheduleProfilesProvider>
        </NotificationProvider>
      </ActivityProvider>
    </ThemeProvider>
  );
}
