/*
  # Create moment logs table

  1. New Tables
    - `moment_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `timestamp` (timestamptz, when the moment was logged)
      - `date` (date, derived from timestamp for grouping)
      - `overall_severity` (int, 0-10 scale)
      - `activity` (text, what user was doing)
      - `triggers` (text, potential triggers)
      - `notes` (text, free-form notes)
      - `created_at` (timestamptz)

  2. Related Tables
    - `moment_log_conditions`
      - Links moment logs to specific conditions with severity ratings
      - `id` (uuid, primary key)
      - `moment_log_id` (uuid, foreign key)
      - `user_condition_id` (uuid, foreign key)
      - `severity` (int, 0-10 for this specific condition)
      - `notes` (text, condition-specific notes)

  3. Security
    - Enable RLS on both tables
    - Users can only access their own moment logs
*/

CREATE TABLE IF NOT EXISTS moment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  timestamp timestamptz DEFAULT now() NOT NULL,
  date date NOT NULL,
  overall_severity int CHECK (overall_severity >= 0 AND overall_severity <= 10),
  activity text,
  triggers text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS moment_log_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_log_id uuid REFERENCES moment_logs(id) ON DELETE CASCADE NOT NULL,
  user_condition_id uuid REFERENCES user_conditions(id) ON DELETE CASCADE NOT NULL,
  severity int CHECK (severity >= 0 AND severity <= 10),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE moment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_log_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own moment logs"
  ON moment_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own moment logs"
  ON moment_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own moment logs"
  ON moment_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own moment logs"
  ON moment_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own moment log conditions"
  ON moment_log_conditions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM moment_logs
      WHERE moment_logs.id = moment_log_conditions.moment_log_id
      AND moment_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own moment log conditions"
  ON moment_log_conditions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM moment_logs
      WHERE moment_logs.id = moment_log_conditions.moment_log_id
      AND moment_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own moment log conditions"
  ON moment_log_conditions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM moment_logs
      WHERE moment_logs.id = moment_log_conditions.moment_log_id
      AND moment_logs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM moment_logs
      WHERE moment_logs.id = moment_log_conditions.moment_log_id
      AND moment_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own moment log conditions"
  ON moment_log_conditions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM moment_logs
      WHERE moment_logs.id = moment_log_conditions.moment_log_id
      AND moment_logs.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_moment_logs_user_date ON moment_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_moment_logs_timestamp ON moment_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_moment_log_conditions_log_id ON moment_log_conditions(moment_log_id);
