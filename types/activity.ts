export type ActivityCategory = 
  | 'class' 
  | 'study' 
  | 'work' 
  | 'personal' 
  | 'health' 
  | 'social' 
  | 'other';

export type ActivityPriority = 'low' | 'medium' | 'high';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface Activity {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category: ActivityCategory;
  priority: ActivityPriority;
  start_time: string; // ISO date-time
  end_time: string;   // ISO date-time
  end_date?: string;  // for recurring events
  notes?: string;
  recurrence: RecurrenceType;
  recurrence_days?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  reminder_minutes: number;
  color?: string;
  location?: string;
  is_completed: boolean;
  profile_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityException {
  id: string;
  activity_id: string;
  exception_date: string;
  is_deleted: boolean;
  modified_start_time?: string;
  modified_end_time?: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  activity_id: string;
  user_id: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ParsedActivity {
  title: string;
  category?: ActivityCategory;
  priority?: ActivityPriority;
  start_time?: string;
  end_time?: string;
  recurrence?: RecurrenceType;
  recurrence_days?: number[];
  reminder_minutes?: number;
  notes?: string;
  day?: string;
}
