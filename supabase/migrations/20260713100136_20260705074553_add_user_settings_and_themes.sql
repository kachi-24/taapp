/*
# Add user settings and themes

1. New Tables
   - `user_settings` — one row per user storing personalisation preferences
     - `id` (uuid, PK)
     - `user_id` (uuid, UNIQUE FK → auth.users, CASCADE delete) — one settings row per account
     - `theme_mode` (text, default 'system') — light | dark | system
     - `accent_color` (text, default 'blue') — blue | green | orange | red | teal | amber
     - `reminder_minutes` (integer, default 15) — global default reminder lead-time
     - `alarm_sound` (text, default 'default') — identifier for the alarm audio asset
     - `notification_sound` (text, default 'default') — identifier for the notification audio asset
     - `quiet_hours_start` (text, nullable) — HH:MM string for start of do-not-disturb window
     - `quiet_hours_end` (text, nullable) — HH:MM string for end of do-not-disturb window
     - `voice_language` (text, default 'en-US') — BCP-47 language tag for voice recognition
     - `biometric_enabled` (boolean, default false) — whether biometric lock is active
     - `created_at`, `updated_at` (timestamptz)

2. Triggers
   - `user_settings_updated_at` — stamps `updated_at` before UPDATE (reuses `update_updated_at()`)

3. Security
   - RLS enabled on `user_settings`.
   - Owner-scoped CRUD policies for authenticated users via `auth.uid() = user_id`.
*/

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  theme_mode TEXT NOT NULL DEFAULT 'system',
  accent_color TEXT NOT NULL DEFAULT 'blue',
  reminder_minutes INTEGER NOT NULL DEFAULT 15,
  alarm_sound TEXT NOT NULL DEFAULT 'default',
  notification_sound TEXT NOT NULL DEFAULT 'default',
  quiet_hours_start TEXT,
  quiet_hours_end TEXT,
  voice_language TEXT NOT NULL DEFAULT 'en-US',
  biometric_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_settings" ON user_settings;
CREATE POLICY "select_own_settings" ON user_settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_settings" ON user_settings;
CREATE POLICY "insert_own_settings" ON user_settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_settings" ON user_settings;
CREATE POLICY "update_own_settings" ON user_settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_settings" ON user_settings;
CREATE POLICY "delete_own_settings" ON user_settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS user_settings_updated_at ON user_settings;
CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
