-- FIX: Infinite recursion in RLS policies
-- Run this in the Supabase SQL Editor
-- The recursive subquery "SELECT ... FROM profiles WHERE id = auth.uid()" inside
-- policies causes infinite recursion. This replaces them with a SECURITY DEFINER
-- function that bypasses RLS.

-- 1. Helper function (bypasses RLS, so no recursion)
CREATE OR REPLACE FUNCTION is_staff(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role IN ('super_admin', 'librarian')
  );
$$;

-- 2. Drop all recursive policies
DROP POLICY IF EXISTS "Staff can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Staff can insert books" ON books;
DROP POLICY IF EXISTS "Staff can update books" ON books;
DROP POLICY IF EXISTS "Staff can delete books" ON books;
DROP POLICY IF EXISTS "Staff can view all loans" ON loans;
DROP POLICY IF EXISTS "Staff can insert loans" ON loans;
DROP POLICY IF EXISTS "Staff can update loans" ON loans;
DROP POLICY IF EXISTS "Staff can view all holds" ON holds;
DROP POLICY IF EXISTS "Staff can manage events" ON events;
DROP POLICY IF EXISTS "Staff can update events" ON events;
DROP POLICY IF EXISTS "Staff can delete events" ON events;
DROP POLICY IF EXISTS "Staff can view all registrations" ON event_registrations;
DROP POLICY IF EXISTS "Staff can check in" ON event_registrations;
DROP POLICY IF EXISTS "Staff can view all bookings" ON bookings;

-- 3. Recreate with non-recursive function calls
CREATE POLICY "Staff can view all profiles"
  ON profiles FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert books"
  ON books FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update books"
  ON books FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete books"
  ON books FOR DELETE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can view all loans"
  ON loans FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can insert loans"
  ON loans FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update loans"
  ON loans FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can view all holds"
  ON holds FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can manage events"
  ON events FOR INSERT WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "Staff can update events"
  ON events FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can delete events"
  ON events FOR DELETE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can view all registrations"
  ON event_registrations FOR SELECT USING (is_staff(auth.uid()));
CREATE POLICY "Staff can check in"
  ON event_registrations FOR UPDATE USING (is_staff(auth.uid()));
CREATE POLICY "Staff can view all bookings"
  ON bookings FOR SELECT USING (is_staff(auth.uid()));
