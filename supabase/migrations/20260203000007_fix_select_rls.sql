-- Allow users to view their own profile (Crucial for Client-side role checks)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow admins to view all profiles (Needed for Member Management Page)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );
