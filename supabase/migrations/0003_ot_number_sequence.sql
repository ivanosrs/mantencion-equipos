-- Adds a database-backed sequential counter for work order numbers,
-- exposed via a SECURITY DEFINER function so authenticated clients can
-- call it through PostgREST RPC without being granted raw sequence access.
--
-- IMPORTANT: before running this, check the highest `ot_number` you've
-- already entered manually, then after creating the sequence run:
--   ALTER SEQUENCE work_order_number_seq RESTART WITH <that_number + 1>;
-- so auto-generated numbers don't collide with existing manual entries.

CREATE SEQUENCE IF NOT EXISTS work_order_number_seq;

CREATE OR REPLACE FUNCTION public.next_ot_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lpad(nextval('work_order_number_seq')::text, 5, '0');
$$;

GRANT EXECUTE ON FUNCTION public.next_ot_number() TO authenticated;
