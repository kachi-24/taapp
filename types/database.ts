export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string;
          priority: string;
          start_time: string;
          end_time: string;
          end_date: string | null;
          notes: string | null;
          recurrence: string;
          recurrence_days: number[] | null;
          reminder_minutes: number;
          color: string | null;
          location: string | null;
          is_completed: boolean;
          profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['activities']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          theme_mode: string;
          accent_color: string;
          reminder_minutes: number;
          alarm_sound: string;
          notification_sound: string;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          voice_language: string;
          biometric_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_settings']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          activity_id: string | null;
          title: string;
          body: string;
          type: string;
          scheduled_for: string;
          is_read: boolean;
          is_dismissed: boolean;
          data: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      schedule_profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          color: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['schedule_profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['schedule_profiles']['Insert']>;
      };
    };
  };
}
