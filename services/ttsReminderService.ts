import { Activity } from '@/types/activity';
import { speak, stopSpeaking, isTTSSupported } from './audioService';

export interface TTSReminderOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

// Track which activities have already been announced to prevent duplicates
const announcedActivityIds = new Set<string>();

/**
 * Build a natural-language spoken reminder for an activity.
 *
 * Examples:
 *   "Good morning! It is 8:00 AM. It's time for your Mathematics class in Room B201."
 *   "It's 6:00 PM. Time for your Gym session at FitLife Gym."
 *   "It's 2:00 PM. Time for your Team Meeting."
 */
export function buildAnnouncement(activity: Activity): string {
  const startDate = new Date(activity.start_time);
  const hour = startDate.getHours();
  const minute = startDate.getMinutes();

  // Format time as "8:00 AM" / "6:00 PM"
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const timeStr = `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;

  // Time-based greeting
  let greeting = '';
  if (hour < 12) {
    greeting = 'Good morning! ';
  } else if (hour < 17) {
    greeting = 'Good afternoon! ';
  } else {
    greeting = 'Good evening! ';
  }

  const title = activity.title || 'your activity';
  const location = activity.location?.trim();

  let sentence: string;
  if (location) {
    sentence = `It's ${timeStr}. Time for your ${title} at ${location}.`;
  } else {
    sentence = `It's ${timeStr}. Time for your ${title}.`;
  }

  return greeting + sentence;
}

/**
 * Speak the reminder announcement for an activity.
 * Uses the selected TTS language/voice from settings.
 * Prevents duplicate announcements for the same activity.
 */
export function announceActivity(activity: Activity, options: TTSReminderOptions = {}): void {
  if (!isTTSSupported()) return;

  // Prevent duplicate announcements for the same activity
  if (announcedActivityIds.has(activity.id)) return;
  announcedActivityIds.add(activity.id);

  const text = buildAnnouncement(activity);
  speak(text, {
    language: options.language ?? 'en-US',
    rate: options.rate ?? 0.95,
    pitch: options.pitch ?? 1,
    volume: options.volume ?? 1,
    onError: () => {
      // On error, allow retry by removing from announced set
      announcedActivityIds.delete(activity.id);
    },
  });
}

/**
 * Speak the reminder and wait for it to finish before starting the alarm sound.
 * This prevents the TTS and alarm sound from overlapping.
 */
export function announceThenAlarm(
  activity: Activity,
  alarmSoundId: string,
  onAlarmStart: () => void,
  options: TTSReminderOptions = {}
): void {
  if (!isTTSSupported()) {
    // No TTS — just start the alarm immediately
    onAlarmStart();
    return;
  }

  // Prevent duplicate announcements
  if (announcedActivityIds.has(activity.id)) {
    onAlarmStart();
    return;
  }
  announcedActivityIds.add(activity.id);

  const text = buildAnnouncement(activity);
  speak(text, {
    language: options.language ?? 'en-US',
    rate: options.rate ?? 0.95,
    pitch: options.pitch ?? 1,
    volume: options.volume ?? 1,
    onEnd: () => {
      // Start the alarm sound after the announcement finishes
      onAlarmStart();
    },
    onError: () => {
      announcedActivityIds.delete(activity.id);
      // Still start the alarm even if TTS fails
      onAlarmStart();
    },
  });
}

/** Stop any ongoing TTS announcement. */
export function stopAnnouncement(): void {
  stopSpeaking();
}

/** Clear the announced set — allows re-announcing after snooze. */
export function clearAnnounced(activityId: string): void {
  announcedActivityIds.delete(activityId);
}

/** Reset all tracked announcements. */
export function resetAllAnnouncements(): void {
  announcedActivityIds.clear();
}
