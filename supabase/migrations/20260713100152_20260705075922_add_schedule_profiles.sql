/*
# Add schedule profiles

1. New Tables
   - `schedule_profiles` — named groupings / modes that activities can belong to (e.g. "Semester A", "Work Week", "Summer")
     - `id` (uuid, PK)
     - `user_id` (uuid, FK → auth.users, CASCADE delete)
     - `name` (text, not null) — display name of the profile
     - `description` (text, nullable) — optional longer description
     - `color` (text, default '#3B82F6') — hex color used to visually distinguish the profile in the UI
     - `is_active` (boolean, default false) — whether this is the currently selected profile
     - `created_at`, `updated_at` (timestamptz)

2. Triggers
   - `schedule_profiles_updated_at` — stamps `updated_at` before UPDATE (reuses `update_updated_at()`)

3. Security
   - RLS enabled on `schedule_profiles`.
   - Owner-scoped CRUD policies for authenticated users via `auth.uid() = user_id`.

4. Important Notes
   - Only one profile should have `is_active = true` per user at any given time; enforcing this as a single-active constraint is left to application logic or a future trigger.
   - The `profile_id` column on `activities` (added in migration 20260703150744) references these rows.
*/

CREATE TABLE IF NOT EXISTS schedule_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE schedule_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profiles" ON schedule_profiles;
CREATE POLICY "select_own_profiles" ON schedule_profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profiles" ON schedule_profiles;
CREATE POLICY "insert_own_profiles" ON schedule_profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profiles" ON schedule_profiles;
CREATE POLICY "update_own_profiles" ON schedule_profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profiles" ON schedule_profiles;
CREATE POLICY "delete_own_profiles" ON schedule_profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS schedule_profiles_updated_at ON schedule_profiles;
CREATE TRIGGER schedule_profiles_updated_at
  BEFORE UPDATE ON schedule_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
