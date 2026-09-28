-- Fix RLS policies for equipments soft delete
-- The UPDATE policy needs a CHECK clause to validate the new row state
-- Also ensure SELECT policy allows admins to see inactive equipments for management

-- Drop and recreate policies with proper CHECK clauses
DROP POLICY IF EXISTS "Admins can update equipment" ON equipments;
CREATE POLICY "Admins can update equipment"
  ON equipments FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can delete equipment" ON equipments;
CREATE POLICY "Admins can delete equipment"
  ON equipments FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Allow admins to see ALL equipments (including inactive) for management
DROP POLICY IF EXISTS "Authenticated users can read all equipment" ON equipments;
CREATE POLICY "Authenticated users can read all equipment"
  ON equipments FOR SELECT
  USING (
    auth.role() = 'authenticated' 
    AND (
      is_active = true 
      OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    )
  );

-- Ensure INSERT policy exists for admins
DROP POLICY IF EXISTS "Admins can insert equipment" ON equipments;
CREATE POLICY "Admins can insert equipment"
  ON equipments FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');