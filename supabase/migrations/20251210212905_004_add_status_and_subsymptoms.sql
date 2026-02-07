/*
  # Add status field to user_conditions and create sub_symptoms table

  1. Changes to `user_conditions`
    - Add `status` field (enum: diagnosed, likely, exploring, monitoring)
    - Add `notes` field for user notes
    - Default status to 'exploring'

  2. New Tables
    - `sub_symptoms`
      - `id` (uuid, primary key)
      - `user_condition_id` (uuid, foreign key to user_conditions)
      - `name` (text, symptom name)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on sub_symptoms table
    - Users can only access their own sub-symptoms
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_conditions' AND column_name = 'status'
  ) THEN
    ALTER TABLE user_conditions ADD COLUMN status text DEFAULT 'exploring' CHECK (status IN ('diagnosed', 'likely', 'exploring', 'monitoring'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_conditions' AND column_name = 'notes'
  ) THEN
    ALTER TABLE user_conditions ADD COLUMN notes text;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS sub_symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_condition_id uuid REFERENCES user_conditions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE sub_symptoms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sub-symptoms"
  ON sub_symptoms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_conditions
      WHERE user_conditions.id = sub_symptoms.user_condition_id
      AND user_conditions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sub-symptoms"
  ON sub_symptoms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_conditions
      WHERE user_conditions.id = sub_symptoms.user_condition_id
      AND user_conditions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sub-symptoms"
  ON sub_symptoms FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_conditions
      WHERE user_conditions.id = sub_symptoms.user_condition_id
      AND user_conditions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_conditions
      WHERE user_conditions.id = sub_symptoms.user_condition_id
      AND user_conditions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sub-symptoms"
  ON sub_symptoms FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_conditions
      WHERE user_conditions.id = sub_symptoms.user_condition_id
      AND user_conditions.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_sub_symptoms_user_condition ON sub_symptoms(user_condition_id);
