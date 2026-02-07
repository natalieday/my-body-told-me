/*
  # Add Tracking Preferences and Onboarding Fields

  1. Changes
    - Add tracking preference columns to user_preferences table
    - Add onboarding completion flag
    - Add notification preference field

  2. New Columns
    - `track_symptoms` (boolean) - Track symptoms & severity
    - `track_energy_stress` (boolean) - Track energy & stress
    - `track_sleep` (boolean) - Track sleep
    - `track_menstrual_cycle` (boolean) - Track menstrual cycle
    - `track_lifestyle` (boolean) - Track lifestyle factors
    - `onboarding_completed` (boolean) - Has user completed onboarding
    - `notification_preference` (text) - Notification preference: 'daily', 'occasional', 'none'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'track_symptoms'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN track_symptoms boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'track_energy_stress'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN track_energy_stress boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'track_sleep'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN track_sleep boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'track_menstrual_cycle'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN track_menstrual_cycle boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'track_lifestyle'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN track_lifestyle boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'notification_preference'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN notification_preference text DEFAULT 'none';
  END IF;
END $$;
