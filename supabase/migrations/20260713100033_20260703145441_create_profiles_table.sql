/*
# Create profiles table

1. New Tables
   - `profiles`
     - `id` (uuid, primary key, auto-generated)
     - `user_id` (uuid, unique, FK → auth.users, cascades on delete)
     - `full_name` (text, nullable)
     - `avatar_url` (text, nullable)
     - `created_at` (timestamptz, auto-set)
     - `updated_at` (timestamptz, auto-set, maintained by trigger)

2. Functions
   - `update_updated_at()` — trigger function that stamps `updated_at = now()` before any UPDATE. Shared across all tables that need auto-updated timestamps.

3. Triggers
   - `profiles_updated_at` — fires BEFORE UPDATE on `profiles`, calls `update_updated_at()`.

4. Security
   - RLS enabled on `profiles`.
   - Four separate policies (select / insert / update / delete), all scoped to `authenticated`, using `auth.uid() = user_id` as the ownership predicate.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
