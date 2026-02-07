/*
  # Add notes and updated_at columns to log tables

  ## Overview
  Adds tracking fields to daily_logs and moment_logs tables to support user notes
  and track when log entries are modified.

  ## Changes Made

  ### 1. daily_logs table
    - Added `notes` column (text, nullable) - allows users to add detailed notes to daily logs
    - Added `updated_at` column (timestamptz, default now()) - tracks when log entries are modified

  ### 2. moment_logs table
    - Added `notes` column (text, nullable) - allows users to add detailed notes to moment logs
    - Added `updated_at` column (timestamptz, default now()) - tracks when log entries are modified

  ## Notes
  - Uses IF NOT EXISTS checks to ensure safe, idempotent migrations
  - Both notes columns are nullable to maintain backward compatibility
  - updated_at defaults to current timestamp for automatic tracking
*/

-- Add columns to daily_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_logs' AND column_name = 'notes'
  ) THEN
    ALTER TABLE daily_logs ADD COLUMN notes text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_logs' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE daily_logs ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add columns to moment_logs table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moment_logs' AND column_name = 'notes'
  ) THEN
    ALTER TABLE moment_logs ADD COLUMN notes text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'moment_logs' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE moment_logs ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;
