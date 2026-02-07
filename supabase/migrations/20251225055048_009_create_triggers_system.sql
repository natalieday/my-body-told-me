/*
  # Create Triggers System

  1. New Tables
    - `triggers` - Global trigger definitions
      - `id` (uuid, primary key)
      - `key` (text, unique) - Unique identifier
      - `label` (text) - User-facing label
      - `category` (text) - Category grouping
      - `input_type` (text) - binary | scale | enum
      - `options_json` (jsonb) - For enums/scales
      - `is_active` (boolean) - Whether trigger is available
      - `parent_trigger_id` (uuid) - For sub-triggers
      - `sort_order` (integer) - Display order
      - `created_at` (timestamptz)
    
    - `user_triggers` - Per-user trigger preferences
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `trigger_id` (uuid, foreign key)
      - `enabled` (boolean)
      - `sort_order` (integer)
      - `config_json` (jsonb) - Optional customization
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `daily_log_triggers` - Logged trigger values for daily logs
      - `id` (uuid, primary key)
      - `daily_log_id` (uuid, foreign key)
      - `trigger_id` (uuid, foreign key)
      - `value` (numeric) - Numeric or enum index
      - `value_text` (text) - Optional text value
      - `created_at` (timestamptz)
    
    - `moment_log_triggers` - Logged trigger values for moment logs
      - `id` (uuid, primary key)
      - `moment_log_id` (uuid, foreign key)
      - `trigger_id` (uuid, foreign key)
      - `value` (numeric) - Numeric or enum index
      - `value_text` (text) - Optional text value
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  category text NOT NULL,
  input_type text NOT NULL CHECK (input_type IN ('binary', 'scale', 'enum')),
  options_json jsonb,
  is_active boolean DEFAULT true,
  parent_trigger_id uuid REFERENCES triggers(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trigger_id uuid REFERENCES triggers(id) ON DELETE CASCADE NOT NULL,
  enabled boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  config_json jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, trigger_id)
);

CREATE TABLE IF NOT EXISTS daily_log_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id uuid REFERENCES daily_logs(id) ON DELETE CASCADE NOT NULL,
  trigger_id uuid REFERENCES triggers(id) ON DELETE CASCADE NOT NULL,
  value numeric,
  value_text text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS moment_log_triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_log_id uuid REFERENCES moment_logs(id) ON DELETE CASCADE NOT NULL,
  trigger_id uuid REFERENCES triggers(id) ON DELETE CASCADE NOT NULL,
  value numeric,
  value_text text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_log_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_log_triggers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active triggers"
  ON triggers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can read own trigger preferences"
  ON user_triggers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trigger preferences"
  ON user_triggers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trigger preferences"
  ON user_triggers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trigger preferences"
  ON user_triggers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own daily log triggers"
  ON daily_log_triggers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_logs
      WHERE daily_logs.id = daily_log_id
      AND daily_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own daily log triggers"
  ON daily_log_triggers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_logs
      WHERE daily_logs.id = daily_log_id
      AND daily_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own daily log triggers"
  ON daily_log_triggers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_logs
      WHERE daily_logs.id = daily_log_id
      AND daily_logs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_logs
      WHERE daily_logs.id = daily_log_id
      AND daily_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own daily log triggers"
  ON daily_log_triggers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_logs
      WHERE daily_logs.id = daily_log_id
      AND daily_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read own moment log triggers"
  ON moment_log_triggers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM moment_logs
      WHERE moment_logs.id = moment_log_id
      AND moment_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own moment log triggers"
  ON moment_log_triggers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM moment_logs
      WHERE moment_logs.id = moment_log_id
      AND moment_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own moment log triggers"
  ON moment_log_triggers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM moment_logs
      WHERE moment_logs.id = moment_log_id
      AND moment_logs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM moment_logs
      WHERE moment_logs.id = moment_log_id
      AND moment_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own moment log triggers"
  ON moment_log_triggers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM moment_logs
      WHERE moment_logs.id = moment_log_id
      AND moment_logs.user_id = auth.uid()
    )
  );
