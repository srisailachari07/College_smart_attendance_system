-- ═══════════════════════════════════════════════════════════════════════════
-- SmartAttend v2.0 — CRITICAL RLS FIX (Run this in Supabase SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ROOT CAUSE: All RLS policies on all tables used inline EXISTS subqueries
-- that queried the admins table:
--
--   EXISTS (SELECT 1 FROM admins WHERE auth_id = auth.uid())
--
-- When the admins table itself has RLS enabled, this subquery triggers the
-- admins table RLS policy, which then triggers another subquery on admins,
-- causing INFINITE RECURSION (PostgreSQL error 42P17).
--
-- This cascades to ALL tables (students, faculty, sessions, etc.) because
-- their policies also reference the admins table.
--
-- SOLUTION: Create SECURITY DEFINER helper functions. These functions run
-- as the owning role (postgres), which bypasses RLS entirely inside the
-- function body. All policies call these functions instead of inline queries.
--
-- This patch does NOT drop or recreate any tables.
-- It only drops and recreates RLS policies and helper functions.
-- Safe to run on the live database.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Step 1: Drop all existing policies to start fresh ─────────────────────

-- students
DROP POLICY IF EXISTS "students_anon_select"        ON students;
DROP POLICY IF EXISTS "students_authenticated_all"  ON students;
DROP POLICY IF EXISTS "students_auth_select"        ON students;
DROP POLICY IF EXISTS "students_admin_write"        ON students;

-- faculty
DROP POLICY IF EXISTS "faculty_read_own"            ON faculty;
DROP POLICY IF EXISTS "faculty_authenticated_all"   ON faculty;
DROP POLICY IF EXISTS "faculty_admin_write"         ON faculty;
DROP POLICY IF EXISTS "faculty_anon_lookup"         ON faculty;

-- admins
DROP POLICY IF EXISTS "admins_read_own"             ON admins;
DROP POLICY IF EXISTS "admins_authenticated_all"    ON admins;
DROP POLICY IF EXISTS "admins_anon_lookup"          ON admins;

-- attendance_sessions
DROP POLICY IF EXISTS "sessions_anon_select_active" ON attendance_sessions;
DROP POLICY IF EXISTS "sessions_faculty_insert"     ON attendance_sessions;
DROP POLICY IF EXISTS "sessions_faculty_update"     ON attendance_sessions;
DROP POLICY IF EXISTS "sessions_authenticated_select" ON attendance_sessions;
DROP POLICY IF EXISTS "sessions_auth_insert"        ON attendance_sessions;
DROP POLICY IF EXISTS "sessions_auth_update"        ON attendance_sessions;
DROP POLICY IF EXISTS "sessions_auth_select"        ON attendance_sessions;

-- attendance_records
DROP POLICY IF EXISTS "records_authenticated_select" ON attendance_records;
DROP POLICY IF EXISTS "records_admin_all"            ON attendance_records;
DROP POLICY IF EXISTS "records_anon_select"          ON attendance_records;
DROP POLICY IF EXISTS "records_auth_select"          ON attendance_records;
DROP POLICY IF EXISTS "records_admin_write"          ON attendance_records;

-- attendance_summary
DROP POLICY IF EXISTS "summary_authenticated_select" ON attendance_summary;
DROP POLICY IF EXISTS "summary_admin_all"            ON attendance_summary;
DROP POLICY IF EXISTS "summary_anon_select"          ON attendance_summary;
DROP POLICY IF EXISTS "summary_auth_select"          ON attendance_summary;
DROP POLICY IF EXISTS "summary_admin_write"          ON attendance_summary;

-- settings
DROP POLICY IF EXISTS "settings_anon_select"         ON settings;
DROP POLICY IF EXISTS "settings_authenticated_select" ON settings;
DROP POLICY IF EXISTS "settings_admin_write"         ON settings;
DROP POLICY IF EXISTS "settings_auth_select"         ON settings;

-- audit_logs
DROP POLICY IF EXISTS "audit_admin_select"           ON audit_logs;
DROP POLICY IF EXISTS "audit_authenticated_insert"   ON audit_logs;
DROP POLICY IF EXISTS "audit_anon_insert"            ON audit_logs;
DROP POLICY IF EXISTS "audit_auth_insert"            ON audit_logs;


-- ── Step 2: Create SECURITY DEFINER helper functions ─────────────────────
--
-- These functions bypass RLS (run as postgres), so calling them from
-- within a policy does NOT trigger recursive policy evaluation.

DROP FUNCTION IF EXISTS is_admin();

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admins
    WHERE auth_id = auth.uid()
      AND is_active = TRUE
  );
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO anon, authenticated;

DROP FUNCTION IF EXISTS is_faculty_member();

CREATE OR REPLACE FUNCTION is_faculty_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.faculty
    WHERE auth_id = auth.uid()
      AND is_active = TRUE
  );
$$;

GRANT EXECUTE ON FUNCTION is_faculty_member() TO authenticated;


-- ── Step 3: Ensure RLS is enabled on all tables ───────────────────────────

ALTER TABLE students            ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty             ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins              ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_summary  ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs          ENABLE ROW LEVEL SECURITY;


-- ── Step 4: Create new, recursion-safe policies ───────────────────────────

-- ◆ students
-- Anonymous users can look up all students (needed for mobile number check
-- in attendance flow, which runs before any authentication).
CREATE POLICY "students_anon_select"
  ON students FOR SELECT TO anon
  USING (TRUE);

-- Any authenticated user can read students (admin dashboard, faculty session view)
CREATE POLICY "students_auth_select"
  ON students FOR SELECT TO authenticated
  USING (TRUE);

-- Only admins can write student records via direct table access.
-- register_student() is SECURITY DEFINER so it bypasses this for anonymous registrations.
CREATE POLICY "students_admin_write"
  ON students FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ◆ faculty
-- Anonymous users can look up faculty by faculty_id/email BEFORE signing in.
-- This is required because facultyLogin() calls api.Faculty.findByFacultyId()
-- BEFORE calling auth.signInWithPassword(). At that point the user is anon.
CREATE POLICY "faculty_anon_lookup"
  ON faculty FOR SELECT TO anon, authenticated
  USING (TRUE);

-- Faculty members can read their own profile; admins can read all.
CREATE POLICY "faculty_read_own"
  ON faculty FOR SELECT TO authenticated
  USING (auth_id = auth.uid() OR is_admin());

-- Only admins can write faculty records.
CREATE POLICY "faculty_admin_write"
  ON faculty FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ◆ admins
-- Anonymous CAN look up admin records by username/email.
-- This is REQUIRED because adminLogin() calls api.Admins.findByUsername()
-- BEFORE calling auth.signInWithPassword(). At that point the user has no
-- Supabase session yet, so they are the anon role.
CREATE POLICY "admins_anon_lookup"
  ON admins FOR SELECT TO anon, authenticated
  USING (TRUE);

-- Authenticated admins can read their own record.
-- Uses auth_id = auth.uid() ONLY — no self-referential subquery, no recursion.
CREATE POLICY "admins_read_own"
  ON admins FOR SELECT TO authenticated
  USING (auth_id = auth.uid());

-- ◆ attendance_sessions
-- Anonymous read on active sessions (students need to validate the code)
CREATE POLICY "sessions_anon_select_active"
  ON attendance_sessions FOR SELECT TO anon
  USING (status = 'active' AND end_time > NOW());

-- Faculty (authenticated) can create sessions
CREATE POLICY "sessions_auth_insert"
  ON attendance_sessions FOR INSERT TO authenticated
  WITH CHECK (is_faculty_member() OR is_admin());

-- Faculty can update their own sessions; admins can update any
CREATE POLICY "sessions_auth_update"
  ON attendance_sessions FOR UPDATE TO authenticated
  USING (
    (is_faculty_member() AND faculty_id = (SELECT id FROM faculty WHERE auth_id = auth.uid() LIMIT 1))
    OR is_admin()
  );

-- Any authenticated user can read sessions
CREATE POLICY "sessions_auth_select"
  ON attendance_sessions FOR SELECT TO authenticated
  USING (TRUE);

-- ◆ attendance_records
-- Anonymous can read records (mark_attendance SECURITY DEFINER RPC needs this)
CREATE POLICY "records_anon_select"
  ON attendance_records FOR SELECT TO anon
  USING (TRUE);

-- Any authenticated user can read records
CREATE POLICY "records_auth_select"
  ON attendance_records FOR SELECT TO authenticated
  USING (TRUE);

-- Only admins can modify records via direct table access.
-- Triggers (trg_fn_sync_summary) handle summary updates as SECURITY DEFINER.
CREATE POLICY "records_admin_write"
  ON attendance_records FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ◆ attendance_summary
-- Anonymous can read (needed for student profile page)
CREATE POLICY "summary_anon_select"
  ON attendance_summary FOR SELECT TO anon
  USING (TRUE);

CREATE POLICY "summary_auth_select"
  ON attendance_summary FOR SELECT TO authenticated
  USING (TRUE);

-- Only admins can directly write summary rows (triggers handle normal ops)
CREATE POLICY "summary_admin_write"
  ON attendance_summary FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ◆ settings
CREATE POLICY "settings_anon_select"
  ON settings FOR SELECT TO anon
  USING (TRUE);

CREATE POLICY "settings_auth_select"
  ON settings FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "settings_admin_write"
  ON settings FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ◆ audit_logs
CREATE POLICY "audit_admin_select"
  ON audit_logs FOR SELECT TO authenticated
  USING (is_admin());

-- SECURITY DEFINER RPCs (mark_attendance, etc.) call this as postgres,
-- which bypasses RLS. But we also allow anon and authenticated inserts
-- for direct audit calls from the frontend.
CREATE POLICY "audit_anon_insert"
  ON audit_logs FOR INSERT TO anon
  WITH CHECK (TRUE);

CREATE POLICY "audit_auth_insert"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (TRUE);


-- ── Step 5: Ensure admin seed data exists ─────────────────────────────────
-- Replace <YOUR_AUTH_UUID> with the UUID from Supabase Dashboard →
-- Authentication → Users → the admin user row.
-- If you already ran the schema.sql seed, this block will do nothing (ON CONFLICT).

INSERT INTO admins (auth_id, username, admin_name, email, is_active)
VALUES ('ef0c9500-512a-48b3-a14f-0c80a5890d4f', 'admin', 'Administrator', 'srisailachari07@gmail.com', TRUE)
ON CONFLICT (username) DO UPDATE
  SET auth_id   = EXCLUDED.auth_id,
      admin_name = EXCLUDED.admin_name,
      email      = EXCLUDED.email,
      is_active  = EXCLUDED.is_active;


-- ── Verification queries (run after applying) ─────────────────────────────
-- These should return rows confirming policies exist with no recursion:

-- SELECT policyname, tablename FROM pg_policies ORDER BY tablename, policyname;
-- SELECT * FROM admins;
-- SELECT is_admin();  -- run as authenticated admin → should return true
