-- Fix: "Admins can read all profiles" / "Admins can create profiles" policies
-- queried the `profiles` table from within a policy defined ON `profiles`,
-- which Postgres rejects with "infinite recursion detected in policy for
-- relation profiles". This silently broke every admin-role check in the app
-- (isAdmin always resolved to false), hiding admin-only UI and actions.
--
-- Fix: move the role lookup into a SECURITY DEFINER function. Functions
-- created this way run with the privileges of their owner (bypassing RLS
-- on that internal lookup), breaking the recursion.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON profiles;

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can create profiles"
  ON profiles FOR INSERT
  WITH CHECK (public.is_admin());
