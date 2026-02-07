/*
  # Add mood tags to daily logs

  1. Changes
    - Add `mood_tag` column to `daily_logs` table with check constraint
    - Supports: 'good', 'neutral', 'tough', 'fluctuating'

  2. Notes
    - Allows null for backward compatibility with existing logs
    - Future logs should include a mood tag
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_logs' AND column_name = 'mood_tag'
  ) THEN
    ALTER TABLE daily_logs 
    ADD COLUMN mood_tag TEXT CHECK (mood_tag IN ('good', 'neutral', 'tough', 'fluctuating'));
  END IF;
END $$;
