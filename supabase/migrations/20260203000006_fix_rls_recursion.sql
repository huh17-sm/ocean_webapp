-- 1. Create a function to check admin status (Bypasses RLS loop)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- 3. Re-create policies using the secure function
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT
USING ( is_admin() );

CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE
USING ( is_admin() );
