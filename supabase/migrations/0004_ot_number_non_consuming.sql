-- Replace the sequence-based OT number generator: it consumed a number
-- every time the "Generar automático" button was clicked, even if the
-- work order was never actually saved, leaving gaps in the numbering.
--
-- New behavior: compute "highest existing numeric ot_number + 1" on the
-- fly from the work_orders table itself. Clicking the button repeatedly
-- without saving keeps returning the same next-available number; it only
-- advances once a work order with that number is actually inserted.
--
-- Trade-off: this is a read-based "peek", not an atomic counter, so two
-- people generating a number at the exact same moment before either saves
-- could momentarily see the same suggested number. Given this is a small
-- team workflow (not a public form), that's an acceptable trade for
-- avoiding gaps from unsaved clicks.

CREATE OR REPLACE FUNCTION public.next_ot_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT lpad(
    (COALESCE(MAX(ot_number::int), 0) + 1)::text,
    5, '0'
  )
  FROM work_orders
  WHERE ot_number ~ '^[0-9]+$';
$$;

GRANT EXECUTE ON FUNCTION public.next_ot_number() TO authenticated;

-- No longer needed now that generation reads from work_orders directly.
DROP SEQUENCE IF EXISTS work_order_number_seq;
