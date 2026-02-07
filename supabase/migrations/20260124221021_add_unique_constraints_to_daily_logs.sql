/*
  # Add unique constraints for safe upsert operations

  ## Overview
  Adds unique constraints to daily_logs and related tables to ensure data integrity
  and enable safe upsert operations with onConflict handling.

  ## Changes Made

  ### 1. daily_logs table
    - Added unique constraint on (user_id, date) 
    - Ensures only one daily log per user per day
    - Enables upsert with onConflict: 'user_id,date'

  ### 2. daily_log_conditions table
    - Added unique constraint on (daily_log_id, user_condition_id)
    - Prevents duplicate condition entries for the same daily log
    - Enables upsert with onConflict: 'daily_log_id,user_condition_id'

  ### 3. daily_log_triggers table
    - Added unique constraint on (daily_log_id, trigger_id)
    - Prevents duplicate trigger entries for the same daily log
    - Enables upsert with onConflict: 'daily_log_id,trigger_id'

  ## Notes
  - These constraints make upsert operations safe and predictable
  - Prevents accidental data duplication
  - Uses IF NOT EXISTS checks for idempotent migrations
*/

-- Add unique constraint to daily_logs (one log per user per day)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_logs_user_id_date_key'
  ) THEN
    ALTER TABLE daily_logs 
    ADD CONSTRAINT daily_logs_user_id_date_key 
    UNIQUE (user_id, date);
  END IF;
END $$;

-- Add unique constraint to daily_log_conditions (one entry per log per condition)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_log_conditions_daily_log_id_user_condition_id_key'
  ) THEN
    ALTER TABLE daily_log_conditions 
    ADD CONSTRAINT daily_log_conditions_daily_log_id_user_condition_id_key 
    UNIQUE (daily_log_id, user_condition_id);
  END IF;
END $$;

-- Add unique constraint to daily_log_triggers (one entry per log per trigger)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'daily_log_triggers_daily_log_id_trigger_id_key'
  ) THEN
    ALTER TABLE daily_log_triggers 
    ADD CONSTRAINT daily_log_triggers_daily_log_id_trigger_id_key 
    UNIQUE (daily_log_id, trigger_id);
  END IF;
END $$;
