-- Security fix: next_ot_number() cast ot_number::int, which errors with
-- "integer out of range" if any manually-entered ot_number is a digit
-- string larger than ~2.1 billion (int4 max). Since the function is
-- SECURITY DEFINER and shared by the whole team, a single such value
-- saved by any authenticated user would break auto-generation for
-- everyone on every subsequent call (single-request denial of service).
--
-- Fix: cast to bigint (max ~9.2 quintillion) instead of int, and cap the
-- matched pattern to 15 digits so no realistic or malicious value can
-- ever approach that ceiling.

CREATE OR REPLACE FUNCTION public.next_ot_number()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT lpad(
    (COALESCE(MAX(ot_number::bigint), 0) + 1)::text,
    5, '0'
  )
  FROM work_orders
  WHERE ot_number ~ '^[0-9]{1,15}$';
$$;

GRANT EXECUTE ON FUNCTION public.next_ot_number() TO authenticated;
