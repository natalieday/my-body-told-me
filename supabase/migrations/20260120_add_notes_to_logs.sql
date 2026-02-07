-- supabase/migrations/20260120_add_notes_to_logs.sql

ALTER TABLE daily_logs
ADD COLUMN notes text;

ALTER TABLE moment_logs
ADD COLUMN notes text;