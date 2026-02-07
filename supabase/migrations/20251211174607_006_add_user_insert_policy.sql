/*
  # Add INSERT policy for users table

  1. Changes
    - Add policy allowing authenticated users to insert their own profile
    
  2. Security
    - Users can only insert their own profile (auth.uid() = id)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'Users can create own profile'
  ) THEN
    CREATE POLICY "Users can create own profile"
      ON users FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
