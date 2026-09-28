-- Soft delete for equipments: add is_active column
ALTER TABLE equipments
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Backfill for any existing rows where is_active might be null
UPDATE equipments SET is_active = true WHERE is_active IS NULL;

-- Index for filtering active equipments
CREATE INDEX IF NOT EXISTS idx_equipments_is_active ON equipments (is_active);

-- Update RLS policies to filter by is_active
DROP POLICY IF EXISTS "Authenticated users can read all equipment" ON equipments;
CREATE POLICY "Authenticated users can read all equipment"
  ON equipments FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = true);

DROP POLICY IF EXISTS "Admins can update equipment" ON equipments;
CREATE POLICY "Admins can update equipment"
  ON equipments FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS "Admins can delete equipment" ON equipments;
CREATE POLICY "Admins can delete equipment"
  ON equipments FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Note: INSERT policy doesn't need is_active filter (new equipments are active by default)