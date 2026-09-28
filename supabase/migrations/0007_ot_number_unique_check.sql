-- Add UNIQUE constraint to ot_number to prevent duplicates
-- First, check if there are any duplicate ot_numbers and handle them
DO $$
DECLARE
  duplicate_count int;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT ot_number
    FROM work_orders
    WHERE ot_number ~ '^[0-9]{1,15}$'
    GROUP BY ot_number
    HAVING COUNT(*) > 1
  ) d;
  
  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Existen % números de OT duplicados. Resuélvelos antes de aplicar esta migración.', duplicate_count;
  END IF;
END $$;

-- Add unique constraint
ALTER TABLE work_orders
ADD CONSTRAINT work_orders_ot_number_unique UNIQUE (ot_number);

-- Create function to check if an OT number already exists
CREATE OR REPLACE FUNCTION public.check_ot_number_exists(p_ot_number text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM work_orders
    WHERE ot_number = p_ot_number
  );
$$;

GRANT EXECUTE ON FUNCTION public.check_ot_number_exists(text) TO authenticated;