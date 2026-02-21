-- ============================================
-- Fix RLS Policies for Classes and Reservations Visibility
-- ============================================

-- 1. Ensure Classes are readable by authenticated users
-- The dashboard joins reservations with classes. If classes are not readable, the join returns nothing.
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.classes;
CREATE POLICY "Enable read access for all users" ON public.classes
    FOR SELECT USING (true); -- Publicly readable (or authenticated users only if preferred)

-- 2. Ensure Reservations are readable by owners
-- Re-applying just to be sure, although it seemed fine.
DROP POLICY IF EXISTS "Users can view own reservations" ON public.reservations;
CREATE POLICY "Users can view own reservations" ON public.reservations
    FOR SELECT USING (auth.uid() = user_id);

-- 3. Ensure Service Role can bypass everything (already true by default, but good to check)
-- No action needed for service role.

-- 4. Check class_requests too (just in case)
ALTER TABLE public.class_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own class requests" ON public.class_requests;
CREATE POLICY "Users can view own class requests" ON public.class_requests
    FOR SELECT USING (auth.uid() = user_id);
