import { Activity, ActivityException } from '@/types/activity';

export interface OccurrenceDate {
  date: string; // YYYY-MM-DD
  startTime: string; // ISO
  endTime: string;   // ISO
  isException: boolean;
  exceptionId?: string;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function getOccurrencesInRange(
  activity: Activity,
  exceptions: ActivityException[],
  rangeStart: Date,
  rangeEnd: Date
): OccurrenceDate[] {
  const occurrences: OccurrenceDate[] = [];
  const actExceptions = exceptions.filter(e => e.activity_id === activity.id);

  const startDt = new Date(activity.start_time);
  const endDt = new Date(activity.end_time);
  const endDateDt = activity.end_date ? new Date(activity.end_date) : null;

  function buildOccurrence(date: Date): OccurrenceDate | null {
    const dateStr = toDateString(date);
    const exc = actExceptions.find(e => e.exception_date === dateStr);
    if (exc?.is_deleted) return null;

    let occStart: Date, occEnd: Date;
    if (exc?.modified_start_time) {
      occStart = new Date(exc.modified_start_time);
      occEnd = exc.modified_end_time ? new Date(exc.modified_end_time) : new Date(occStart.getTime() + (endDt.getTime() - startDt.getTime()));
    } else {
      occStart = new Date(date);
      occStart.setHours(startDt.getHours(), startDt.getMinutes(), 0, 0);
      occEnd = new Date(date);
      occEnd.setHours(endDt.getHours(), endDt.getMinutes(), 0, 0);
    }

    if (occEnd <= rangeStart || occStart >= rangeEnd) return null;

    return {
      date: dateStr,
      startTime: occStart.toISOString(),
      endTime: occEnd.toISOString(),
      isException: !!exc,
      exceptionId: exc?.id,
    };
  }

  if (activity.recurrence === 'none') {
    const occ = buildOccurrence(startDt);
    if (occ) occurrences.push(occ);
    return occurrences;
  }

  let current = new Date(startDt);
  current.setHours(0, 0, 0, 0);

  const limit = new Date(rangeEnd);
  if (endDateDt && endDateDt < limit) limit.setTime(endDateDt.getTime());

  let iterations = 0;
  const MAX_ITER = 1000;

  while (current <= limit && iterations < MAX_ITER) {
    iterations++;
    let shouldInclude = false;

    if (activity.recurrence === 'daily') {
      shouldInclude = current >= rangeStart;
    } else if (activity.recurrence === 'weekly') {
      const days = activity.recurrence_days ?? [startDt.getDay()];
      shouldInclude = days.includes(current.getDay()) && current >= new Date(activity.start_time.split('T')[0]);
    } else if (activity.recurrence === 'monthly') {
      shouldInclude = current.getDate() === startDt.getDate() && current >= rangeStart;
    }

    if (shouldInclude && current >= rangeStart) {
      const occ = buildOccurrence(new Date(current));
      if (occ) occurrences.push(occ);
    }

    current = addDays(current, 1);
  }

  return occurrences;
}

export function getActivitiesForDay(
  activities: Activity[],
  exceptions: ActivityException[],
  date: Date
): { activity: Activity; occurrence: OccurrenceDate }[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const result: { activity: Activity; occurrence: OccurrenceDate }[] = [];

  for (const activity of activities) {
    const occs = getOccurrencesInRange(activity, exceptions, dayStart, dayEnd);
    for (const occ of occs) {
      result.push({ activity, occurrence: occ });
    }
  }

  result.sort((a, b) => new Date(a.occurrence.startTime).getTime() - new Date(b.occurrence.startTime).getTime());
  return result;
}

export function getWeekActivities(
  activities: Activity[],
  exceptions: ActivityException[],
  weekStart: Date
): Map<string, { activity: Activity; occurrence: OccurrenceDate }[]> {
  const map = new Map<string, { activity: Activity; occurrence: OccurrenceDate }[]>();

  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    const key = toDateString(day);
    map.set(key, getActivitiesForDay(activities, exceptions, day));
  }

  return map;
}

export function findFreeSlots(
  activities: Activity[],
  exceptions: ActivityException[],
  date: Date,
  minDurationMinutes = 30
): { start: Date; end: Date }[] {
  const dayActivities = getActivitiesForDay(activities, exceptions, date);
  const slots: { start: Date; end: Date }[] = [];
  const dayStart = new Date(date);
  dayStart.setHours(8, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(22, 0, 0, 0);

  const busy = dayActivities
    .map(({ occurrence }) => ({
      start: new Date(occurrence.startTime),
      end: new Date(occurrence.endTime),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let cursor = dayStart;

  for (const slot of busy) {
    if (slot.start > cursor) {
      const dur = (slot.start.getTime() - cursor.getTime()) / 60000;
      if (dur >= minDurationMinutes) {
        slots.push({ start: new Date(cursor), end: new Date(slot.start) });
      }
    }
    if (slot.end > cursor) cursor = slot.end;
  }

  if (cursor < dayEnd) {
    const dur = (dayEnd.getTime() - cursor.getTime()) / 60000;
    if (dur >= minDurationMinutes) {
      slots.push({ start: new Date(cursor), end: dayEnd });
    }
  }

  return slots;
}
