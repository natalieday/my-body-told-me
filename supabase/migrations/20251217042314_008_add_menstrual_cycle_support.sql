/*
  # Add Menstrual Cycle Support

  1. Changes
    - Add is_cycle flag to conditions table
    - Insert "Menstrual Cycle" as a special condition
    - Add is_cycle field to user_conditions

  2. New Columns
    - `is_cycle` (boolean) - Marks if this is a cycle-type condition
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conditions' AND column_name = 'is_cycle'
  ) THEN
    ALTER TABLE conditions ADD COLUMN is_cycle boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_conditions' AND column_name = 'is_cycle'
  ) THEN
    ALTER TABLE user_conditions ADD COLUMN is_cycle boolean DEFAULT false;
  END IF;
END $$;

INSERT INTO conditions (name, description, is_cycle)
VALUES (
  'Menstrual Cycle',
  'Track menstrual cycle symptoms and patterns',
  true
)
ON CONFLICT (name) DO NOTHING;
