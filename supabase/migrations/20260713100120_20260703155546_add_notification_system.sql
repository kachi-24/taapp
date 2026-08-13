/*
# Add notification system

1. New Tables
   - `notifications` — persisted in-app and push notification records
     - `id` (uuid, PK)
     - `user_id` (uuid, FK → auth.users, CASCADE delete)
     - `activity_id` (uuid, nullable FK → activities, SET NULL on delete) — links the notification to its source activity
     - `title` (text, not null) — short notification headline
     - `body` (text, not null) — full notification message
     - `type` (text, default 'info') — reminder | alarm | info | warning | success
     - `scheduled_for` (timestamptz, not null) — when the notification should fire
     - `is_read` (boolean, default false) — has the user seen it in-app
     - `is_dismissed` (boolean, default false) — has the user explicitly dismissed it
     - `data` (jsonb, nullable) — arbitrary metadata payload (e.g. deep-link params)
     - `created_at` (timestamptz, auto-set)

2. Security
   - RLS enabled on `notifications`.
   - Owner-scoped CRUD policies for authenticated users via `auth.uid() = user_id`.

3. Important Notes
   - No `updated_at` column — notifications are immutable after creation except for `is_read`/`is_dismissed` flags.
   - `activity_id` uses SET NULL (not CASCADE delete) so a deleted activity does not silently remove notification history.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  scheduled_for TIMESTAMPTZ NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
