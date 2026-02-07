
/*
  # My Body Told Me Schema

  1. New Tables
    - `conditions`: Predefined condition list (migraine, IBS, etc.)
    - `users`: Extended user profile with streak tracking
    - `user_conditions`: Many-to-many relationship between users and conditions
    - `daily_logs`: Daily check-in data
    - `daily_log_conditions`: Per-condition severity for each daily log
    - `external_metrics`: Future integration with wearables (Apple Health, MyFitnessPal)
    - `ai_insights`: Cached AI-generated insights

  2. Security
    - Enable RLS on all user-specific tables
    - Users can only access their own data
    - Public read access to conditions table

  3. Key Features
    - Streak tracking (current, longest, lastLogDate)
    - Per-condition tracking with custom labels
    - Daily logging with overall + per-condition severity
    - Support for future external data integrations
*/

-- Conditions table (public, predefined list)
CREATE TABLE IF NOT EXISTS conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users table (extended profile)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_log_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User conditions (many-to-many: user tracks specific conditions)
CREATE TABLE IF NOT EXISTS user_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  condition_id UUID NOT NULL REFERENCES conditions(id) ON DELETE CASCADE,
  custom_label TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, condition_id)
);

ALTER TABLE user_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tracked conditions"
  ON user_conditions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own tracked conditions"
  ON user_conditions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tracked conditions"
  ON user_conditions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own tracked conditions"
  ON user_conditions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Daily logs (daily check-in records)
CREATE TABLE IF NOT EXISTS daily_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  overall_severity INT CHECK (overall_severity >= 0 AND overall_severity <= 10),
  sleep_hours DECIMAL(4,2),
  sleep_quality INT CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
  stress_level INT CHECK (stress_level >= 1 AND stress_level <= 5),
  activity_level TEXT CHECK (activity_level IN ('none', 'light', 'moderate', 'heavy')),
  food_notes TEXT,
  meds_notes TEXT,
  triggers TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily logs"
  ON daily_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own daily logs"
  ON daily_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own daily logs"
  ON daily_logs FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, date);

-- Daily log conditions (per-condition severity for each log)
CREATE TABLE IF NOT EXISTS daily_log_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_log_id UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
  user_condition_id UUID NOT NULL REFERENCES user_conditions(id) ON DELETE CASCADE,
  severity INT CHECK (severity >= 0 AND severity <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(daily_log_id, user_condition_id)
);

ALTER TABLE daily_log_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily log conditions"
  ON daily_log_conditions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_logs
      WHERE daily_logs.id = daily_log_conditions.daily_log_id
      AND daily_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own daily log conditions"
  ON daily_log_conditions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_logs
      WHERE daily_logs.id = daily_log_conditions.daily_log_id
      AND daily_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own daily log conditions"
  ON daily_log_conditions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_logs
      WHERE daily_logs.id = daily_log_conditions.daily_log_id
      AND daily_logs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_logs
      WHERE daily_logs.id = daily_log_conditions.daily_log_id
      AND daily_logs.user_id = auth.uid()
    )
  );

-- External metrics (future: Apple Health, MyFitnessPal, wearables)
CREATE TABLE IF NOT EXISTS external_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE external_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own external metrics"
  ON external_metrics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own external metrics"
  ON external_metrics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_external_metrics_user_timestamp ON external_metrics(user_id, timestamp);

-- AI insights (cached insights to avoid repeated API calls)
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  insights_text TEXT NOT NULL,
  insight_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, insight_date)
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own insights"
  ON ai_insights FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Insert common conditions
INSERT INTO conditions (name, description) VALUES
  ('Migraine', 'Recurring headaches'),
  ('IBS', 'Irritable Bowel Syndrome'),
  ('Hashimoto''s', 'Autoimmune thyroid disease'),
  ('POTS', 'Postural Orthostatic Tachycardia Syndrome'),
  ('Back Pain', 'Persistent lower or upper back pain'),
  ('Chronic Fatigue', 'Persistent fatigue syndrome'),
  ('Anxiety', 'Anxiety disorder'),
  ('Depression', 'Major depressive disorder'),
  ('Fibromyalgia', 'Widespread musculoskeletal pain'),
  ('Lupus', 'Systemic lupus erythematosus'),
  ('Rheumatoid Arthritis', 'RA autoimmune disease'),
  ('Ehlers-Danlos Syndrome', 'EDS connective tissue disorder'),
  ('ME/CFS', 'Myalgic Encephalomyelitis'),
  ('ADHD', 'Attention-deficit/hyperactivity disorder'),
  ('Endometriosis', 'Chronic pelvic pain condition')
ON CONFLICT (name) DO NOTHING;
