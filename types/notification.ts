export type NotificationType = 
  | 'reminder' 
  | 'alarm' 
  | 'info' 
  | 'warning' 
  | 'success';

export interface AppNotification {
  id: string;
  user_id: string;
  activity_id?: string;
  title: string;
  body: string;
  type: NotificationType;
  scheduled_for: string;
  is_read: boolean;
  is_dismissed: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface ScheduledNotification {
  identifier: string;
  activity_id: string;
  scheduled_for: string;
}
