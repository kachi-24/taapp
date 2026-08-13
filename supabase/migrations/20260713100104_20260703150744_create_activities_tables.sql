/*
# Create activities, activity_exceptions, and attendance_records tables

1. New Tables

   - `activities` — the core scheduling entity
     - `id` (uuid, PK)
     - `user_id` (uuid, FK → auth.users, CASCADE delete)
     - `title` (text, not null)
     - `description` (text, nullable)
     - `category` (text, default 'other') — e.g. class, study, work, personal, health, social
     - `priority` (text, default 'medium') — low | medium | high
     - `start_time` (timestamptz, not null)
     - `end_time` (timestamptz, not null)
     - `end_date` (date, nullable) — final date for recurring activities
     - `notes` (text, nullable)
     - `recurrence` (text, default 'none') — none | daily | weekly | monthly
     - `recurrence_days` (integer[], nullable) — 0=Sun … 6=Sat
     - `reminder_minutes` (integer, default 15)
     - `color` (text, nullable) — hex color string
     - `location` (text, nullable)
     - `is_completed` (boolean, default false)
     - `profile_id` (uuid, nullable) — reference to a schedule profile
     - `created_at`, `updated_at` (timestamptz)

   - `activity_exceptions` — overrides / cancellations for individual occurrences of recurring activities
     - `id` (uuid, PK)
     - `activity_id` (uuid, FK → activities, CASCADE delete)
     - `exception_date` (date, not null)
     - `is_deleted` (boolean) — true means this occurrence is cancelled
     - `modified_start_time`, `modified_end_time` (timestamptz, nullable) — rescheduled times
     - `created_at` (timestamptz)
     - UNIQUE constraint on (activity_id, exception_date)

   - `attendance_records` — tracks whether a user attended each occurrence
     - `id` (uuid, PK)
     - `activity_id` (uuid, FK → activities, CASCADE delete)
     - `user_id` (uuid, FK → auth.users, CASCADE delete)
     - `date` (date, not null)
     - `status` (text, default 'present') — present | absent | late | excused
     - `notes` (text, nullable)
     - `created_at`, `updated_at` (timestamptz)
     - UNIQUE constraint on (activity_id, date)

2. Triggers
   - `activities_updated_at` — stamps `updated_at` before UPDATE on `activities`
   - `attendance_updated_at` — stamps `updated_at` before UPDATE on `attendance_records`
   (reuses the `update_updated_at()` function created in the profiles migration)

3. Security
   - RLS enabled on all three tables.
   - `activities`: owner-scoped CRUD via `auth.uid() = user_id`.
   - `activity_exceptions`: scoped through parent `activities` using EXISTS subquery.
   - `attendance_records`: owner-scoped CRUD via `auth.uid() = user_id`.
*/

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'medium',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  end_date DATE,
  notes TEXT,
  recurrence TEXT NOT NULL DEFAULT 'none',
  recurrence_days INTEGER[],
  reminder_minutes INTEGER NOT NULL DEFAULT 15,
  color TEXT,
  location TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  profile_id UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_activities" ON activities;
CREATE POLICY "select_own_activities" ON activities FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_activities" ON activities;
CREATE POLICY "insert_own_activities" ON activities FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_activities" ON activities;
CREATE POLICY "update_own_activities" ON activities FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_activities" ON activities;
CREATE POLICY "delete_own_activities" ON activities FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS activities_updated_at ON activities;
CREATE TRIGGER activities_updated_at
  BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS activity_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
  exception_date DATE NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  modified_start_time TIMESTAMPTZ,
  modified_end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(activity_id, exception_date)
);

ALTER TABLE activity_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_exceptions" ON activity_exceptions;
CREATE POLICY "select_own_exceptions" ON activity_exceptions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM activities WHERE id = activity_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_exceptions" ON activity_exceptions;
CREATE POLICY "insert_own_exceptions" ON activity_exceptions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM activities WHERE id = activity_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_exceptions" ON activity_exceptions;
CREATE POLICY "update_own_exceptions" ON activity_exceptions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM activities WHERE id = activity_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_exceptions" ON activity_exceptions;
CREATE POLICY "delete_own_exceptions" ON activity_exceptions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM activities WHERE id = activity_id AND user_id = auth.uid())
  );

-- -------------------------------------------------------

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(activity_id, date)
);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_attendance" ON attendance_records;
CREATE POLICY "select_own_attendance" ON attendance_records FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_attendance" ON attendance_records;
CREATE POLICY "insert_own_attendance" ON attendance_records FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_attendance" ON attendance_records;
CREATE POLICY "update_own_attendance" ON attendance_records FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_attendance" ON attendance_records;
CREATE POLICY "delete_own_attendance" ON attendance_records FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS attendance_updated_at ON attendance_records;
CREATE TRIGGER attendance_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
