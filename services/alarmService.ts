import { Activity } from '@/types/activity';
import { cancelActivityReminder, scheduleActivityReminder } from './notificationService';

const activeAlarms = new Map<string, string[]>();

export async function scheduleAlarm(activity: Activity, reminderMinutes: number): Promise<void> {
  // Cancel any existing alarms for this activity
  cancelAlarm(activity.id);

  const ids: string[] = [];
  const id = await scheduleActivityReminder(activity, reminderMinutes);
  if (id) ids.push(id);

  if (ids.length > 0) {
    activeAlarms.set(activity.id, ids);
  }
}

export function cancelAlarm(activityId: string): void {
  cancelActivityReminder(activityId);
  activeAlarms.delete(activityId);
}

export function cancelAllAlarms(): void {
  activeAlarms.clear();
}

export async function rescheduleAllAlarms(
  activities: Activity[],
  reminderMinutes: number
): Promise<void> {
  cancelAllAlarms();
  const now = new Date();
  for (const activity of activities) {
    const startTime = new Date(activity.start_time);
    if (startTime > now) {
      await scheduleAlarm(activity, reminderMinutes);
    }
  }
}
