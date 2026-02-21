-- Allow Admins to update any profile
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;
CREATE POLICY "Admins can update any profile." ON public.profiles
  FOR UPDATE
  USING (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );

-- Allow Admins to delete any profile (if needed, good practice to add now)
DROP POLICY IF EXISTS "Admins can delete any profile." ON public.profiles;
CREATE POLICY "Admins can delete any profile." ON public.profiles
  FOR DELETE
  USING (
    exists ( select 1 from public.profiles where id = auth.uid() and role = 'admin' )
  );
