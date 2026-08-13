import { Platform } from 'react-native';
import { Activity } from '@/types/activity';
import { playNotificationSound } from './audioService';
import { announceActivity } from './ttsReminderService';

export interface ScheduledAlarm {
  id: string;
  activityId: string;
  title: string;
  body: string;
  triggerAt: Date;
}

// Map from alarm-id → { timeoutId, activity } so we can pass the activity to callbacks
const scheduledAlarms = new Map<string, { timeoutId: number; activity: Activity }>();

// Single callback invoked when an alarm-tier reminder fires.
// Set by the React layer (InnerApp) to drive the AlarmModal.
type AlarmFiredCallback = (activity: Activity) => void;
let alarmFiredCallback: AlarmFiredCallback | null = null;

// Callback invoked when a notification is tapped — used for deep-linking
type NotificationTapCallback = (activity: Activity) => void;
let notificationTapCallback: NotificationTapCallback | null = null;

export function setAlarmFiredCallback(cb: AlarmFiredCallback | null): void {
  alarmFiredCallback = cb;
}

export function setNotificationTapCallback(cb: NotificationTapCallback | null): void {
  notificationTapCallback = cb;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return true;
}

export function getNotificationPermissionStatus(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (Platform.OS !== 'web') return 'granted';
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as 'granted' | 'denied' | 'default';
}

/**
 * Schedule a reminder for a single activity.
 * @param soundId       The notification sound ID from settings
 * @param voiceLanguage The TTS language code from settings
 */
export async function scheduleActivityReminder(
  activity: Activity,
  reminderMinutes: number,
  soundId: string = 'default',
  voiceLanguage: string = 'en-US'
): Promise<string | null> {
  const startTime = new Date(activity.start_time);
  const triggerAt = new Date(startTime.getTime() - reminderMinutes * 60 * 1000);
  const now = new Date();

  if (triggerAt <= now) return null;

  const id = `reminder-${activity.id}-${triggerAt.getTime()}`;
  const delay = triggerAt.getTime() - now.getTime();

  const timeoutId = window.setTimeout(() => {
    const body = activity.notes
      ? `Starting at ${formatTime(startTime)} · ${activity.notes}`
      : `Starting at ${formatTime(startTime)}`;

    // Browser push notification (passive) + sound
    showBrowserNotification(`Reminder: ${activity.title}`, body, activity, soundId);

    // Speak the reminder aloud via TTS
    announceActivity(activity, { language: voiceLanguage });

    // Alarm-tier callback → triggers AlarmModal + gradual audio
    alarmFiredCallback?.(activity);

    scheduledAlarms.delete(id);
  }, delay);

  scheduledAlarms.set(id, { timeoutId, activity });
  return id;
}

export function cancelActivityReminder(activityId: string): void {
  for (const [key, entry] of scheduledAlarms.entries()) {
    if (key.includes(activityId)) {
      window.clearTimeout(entry.timeoutId);
      scheduledAlarms.delete(key);
    }
  }
}

export function cancelAllReminders(): void {
  for (const entry of scheduledAlarms.values()) {
    window.clearTimeout(entry.timeoutId);
  }
  scheduledAlarms.clear();
}

/**
 * Reschedule reminders for all activities that are still in the future.
 * Called on app startup to restore reminders lost by page reload.
 */
export async function rescheduleAllReminders(
  activities: Activity[],
  defaultReminderMinutes: number,
  soundId: string = 'default',
  voiceLanguage: string = 'en-US'
): Promise<void> {
  cancelAllReminders();
  const now = new Date();
  for (const activity of activities) {
    const reminderMin = activity.reminder_minutes ?? defaultReminderMinutes;
    if (reminderMin > 0) {
      const startTime = new Date(activity.start_time);
      if (startTime > now) {
        await scheduleActivityReminder(activity, reminderMin, soundId, voiceLanguage);
      }
    }
  }
}

function showBrowserNotification(
  title: string,
  body: string,
  activity: Activity,
  soundId: string
): void {
  if (Platform.OS !== 'web') return;
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;

  const n = new Notification(title, {
    body,
    icon: '/assets/images/icon.png',
    tag: activity.id, // prevents duplicate notifications for same activity
  });

  // Play the selected notification sound
  playNotificationSound(soundId);

  // Handle tap — deep-link to schedule screen
  n.onclick = () => {
    window.focus();
    notificationTapCallback?.(activity);
    n.close();
  };
}
