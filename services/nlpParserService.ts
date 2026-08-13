import { ParsedActivity, ActivityCategory, RecurrenceType } from '@/types/activity';

const DAYS_MAP: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

const CATEGORY_KEYWORDS: Record<ActivityCategory, string[]> = {
  class: ['class', 'lecture', 'lesson', 'course', 'seminar', 'lab', 'tutorial'],
  study: ['study', 'studying', 'homework', 'assignment', 'review', 'revision', 'exam', 'test', 'quiz'],
  work: ['work', 'meeting', 'conference', 'presentation', 'office', 'job', 'shift'],
  personal: ['personal', 'errand', 'appointment', 'dentist', 'doctor', 'haircut'],
  health: ['gym', 'workout', 'exercise', 'run', 'yoga', 'fitness', 'sport', 'training'],
  social: ['lunch', 'dinner', 'coffee', 'meet', 'party', 'hangout', 'date'],
  other: [],
};

function parseTimeString(timeStr: string, baseDate: Date): Date | null {
  const cleaned = timeStr.toLowerCase().trim();
  const amPmMatch = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1], 10);
    const minutes = amPmMatch[2] ? parseInt(amPmMatch[2], 10) : 0;
    const period = amPmMatch[3];
    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    const d = new Date(baseDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }
  const h24 = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (h24) {
    const d = new Date(baseDate);
    d.setHours(parseInt(h24[1], 10), parseInt(h24[2], 10), 0, 0);
    return d;
  }
  return null;
}

function resolveDay(text: string): Date {
  const lower = text.toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (lower.includes('today')) return today;
  if (lower.includes('tonight')) return today;
  if (lower.includes('tomorrow')) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }

  for (const [dayName, dayNum] of Object.entries(DAYS_MAP)) {
    if (lower.includes(dayName)) {
      const current = today.getDay();
      let diff = dayNum - current;
      if (diff <= 0) diff += 7;
      const d = new Date(today);
      d.setDate(d.getDate() + diff);
      return d;
    }
  }

  return today;
}

function detectCategory(text: string): ActivityCategory {
  const lower = text.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return cat as ActivityCategory;
    }
  }
  return 'other';
}

function detectRecurrence(text: string): { recurrence: RecurrenceType; recurrence_days?: number[] } {
  const lower = text.toLowerCase();
  if (lower.includes('every day') || lower.includes('daily')) {
    return { recurrence: 'daily' };
  }
  if (lower.includes('every week') || lower.includes('weekly')) {
    return { recurrence: 'weekly' };
  }
  if (lower.includes('every month') || lower.includes('monthly')) {
    return { recurrence: 'monthly' };
  }
  // "every Monday", "every Tuesday" etc.
  const everyDayMatch = lower.match(/every\s+(\w+)/);
  if (everyDayMatch) {
    const dayName = everyDayMatch[1];
    if (dayName in DAYS_MAP) {
      return { recurrence: 'weekly', recurrence_days: [DAYS_MAP[dayName]] };
    }
  }
  return { recurrence: 'none' };
}

function extractTitle(text: string): string {
  // Remove common command prefixes
  const cleaned = text
    .replace(/^(add|schedule|create|set|remind me to|remind me about|i have|i need to|put)\s+/i, '')
    .replace(/\s+(tomorrow|today|tonight|every\s+\w+|on\s+\w+|at\s+\d+.*$)/i, '')
    .trim();

  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function parseVoiceInput(text: string): ParsedActivity {
  const baseDate = resolveDay(text);
  
  // Extract time
  const timePatterns = [
    /at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i,
    /at\s+(\d{1,2}:\d{2})/i,
  ];
  
  let startTime: string | undefined;
  let endTime: string | undefined;

  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = parseTimeString(match[1], baseDate);
      if (parsed) {
        startTime = parsed.toISOString();
        // Default 1-hour duration
        const end = new Date(parsed);
        end.setHours(end.getHours() + 1);
        endTime = end.toISOString();
        break;
      }
    }
  }

  // Check for "from X to Y" pattern
  const rangeMatch = text.match(/from\s+(.+?)\s+to\s+(.+?)(?:\s+on|\s+every|\s*$)/i);
  if (rangeMatch) {
    const s = parseTimeString(rangeMatch[1], baseDate);
    const e = parseTimeString(rangeMatch[2], baseDate);
    if (s) startTime = s.toISOString();
    if (e) endTime = e.toISOString();
  }

  // If no time found, default to next hour
  if (!startTime) {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    startTime = now.toISOString();
    const end = new Date(now);
    end.setHours(end.getHours() + 1);
    endTime = end.toISOString();
  }

  const { recurrence, recurrence_days } = detectRecurrence(text);
  const category = detectCategory(text);
  const title = extractTitle(text);

  // Extract notes: anything after "notes:" or "note:"
  const notesMatch = text.match(/(?:notes?|description):\s*(.+)/i);
  const notes = notesMatch ? notesMatch[1].trim() : undefined;

  return {
    title: title || 'New Activity',
    category,
    priority: 'medium',
    start_time: startTime,
    end_time: endTime,
    recurrence,
    recurrence_days,
    reminder_minutes: 15,
    notes,
    day: baseDate.toISOString().split('T')[0],
  };
}
