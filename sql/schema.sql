-- ═══════════════════════════════════════════════════════════════════════════
-- SmartAttend — College Smart Attendance System
-- Database Schema v3.0 (Restructured & Secured)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Drop existing tables to ensure clean rebuild of v2.0 schema (Requirement 1 & 3) ──
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS attendance_summary CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS attendance_sessions CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP SEQUENCE IF EXISTS student_id_seq CASCADE;

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 1: SEQUENCE
-- Generates concurrent-safe Student IDs: STU000001, STU000002, ...
-- ───────────────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS student_id_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 2: TABLES
-- ───────────────────────────────────────────────────────────────────────────

-- ── Table: students ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
  id                UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id        VARCHAR(10)  NOT NULL UNIQUE
                    DEFAULT 'STU' || LPAD(NEXTVAL('student_id_seq')::TEXT, 6, '0'),
  student_name      TEXT         NOT NULL,
  mobile_number     VARCHAR(15)  NOT NULL UNIQUE,
  lecture_hall      VARCHAR(50)  NOT NULL, -- Check constraint removed to support dynamic configuration
  roll_number       VARCHAR(50)  NOT NULL UNIQUE,
  device_id         VARCHAR(64)  NULL,
  registration_date TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Table: faculty ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS faculty (
  id            UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id       UUID         UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  faculty_id    VARCHAR(20)  NOT NULL UNIQUE,
  faculty_name  TEXT         NOT NULL,
  email         TEXT         NOT NULL UNIQUE,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  -- lecture_hall removed from faculty table to align with select-room workflow
);

-- ── Table: admins ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id          UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_id     UUID    UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  username    TEXT    NOT NULL UNIQUE,
  admin_name  TEXT    NOT NULL,
  email       TEXT    NOT NULL UNIQUE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: attendance_sessions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date     DATE        NOT NULL,
  session_label    VARCHAR(10) NOT NULL, -- S1, S2, etc.
  lecture_hall     VARCHAR(50) NOT NULL,
  attendance_code  VARCHAR(4)  NOT NULL,
  start_time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time         TIMESTAMPTZ NOT NULL,
  status           VARCHAR(10) NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','closed')),
  faculty_id       UUID        REFERENCES faculty(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: attendance_records ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_records (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id    UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id    UUID        NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  session_date  DATE        NOT NULL,
  session_label VARCHAR(10) NOT NULL,
  lecture_hall  VARCHAR(50) NOT NULL,
  status        CHAR(1)     NOT NULL CHECK (status IN ('P','A')),
  marked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  code_used     VARCHAR(4)  NULL,
  device_hash   VARCHAR(64) NULL,
  CONSTRAINT uq_record_student_session UNIQUE (student_id, session_id)
);

-- ── Table: attendance_summary ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance_summary (
  id                    UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id            UUID    NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  present_count         INTEGER NOT NULL DEFAULT 0,
  absent_count          INTEGER NOT NULL DEFAULT 0,
  total_sessions        INTEGER NOT NULL GENERATED ALWAYS AS (present_count + absent_count) STORED,
  attendance_percentage NUMERIC(5,2) NOT NULL GENERATED ALWAYS AS (
    CASE
      WHEN (present_count + absent_count) = 0 THEN 0.00
      ELSE ROUND((present_count::NUMERIC / (present_count + absent_count)) * 100, 2)
    END
  ) STORED,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Table: settings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT        NOT NULL PRIMARY KEY,
  value       TEXT        NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID
);

-- ── Table: audit_logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action      TEXT        NOT NULL,
  actor_id    UUID,
  actor_role  VARCHAR(10),
  actor_name  TEXT,
  target_type TEXT,
  target_id   UUID,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 3: INDEXES
-- ───────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_students_mobile  ON students(mobile_number);
CREATE INDEX IF NOT EXISTS idx_students_hall    ON students(lecture_hall);
CREATE INDEX IF NOT EXISTS idx_students_active  ON students(is_active);
CREATE INDEX IF NOT EXISTS idx_students_sid     ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_roll    ON students(roll_number) WHERE roll_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_date_hall ON attendance_sessions(session_date, lecture_hall);
CREATE INDEX IF NOT EXISTS idx_sessions_status    ON attendance_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_date      ON attendance_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_sessions_faculty   ON attendance_sessions(faculty_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_unique_active
  ON attendance_sessions(session_date, lecture_hall, session_label)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_records_student   ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_session   ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_records_date      ON attendance_records(session_date);
CREATE INDEX IF NOT EXISTS idx_records_hall_date ON attendance_records(lecture_hall, session_date);
CREATE INDEX IF NOT EXISTS idx_records_status    ON attendance_records(status);

CREATE INDEX IF NOT EXISTS idx_summary_student ON attendance_summary(student_id);
CREATE INDEX IF NOT EXISTS idx_summary_percent ON attendance_summary(attendance_percentage);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_faculty_auth  ON faculty(auth_id);
CREATE INDEX IF NOT EXISTS idx_admins_auth   ON admins(auth_id);

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 4: ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────────────────
-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │  CRITICAL: is_admin() SECURITY DEFINER helper                           │
-- │                                                                         │
-- │  RLS policies must NOT do EXISTS (SELECT 1 FROM admins ...) inline.     │
-- │  When the admins table has RLS enabled, such a subquery triggers its    │
-- │  own RLS policies causing INFINITE RECURSION (42P17).                   │
-- │                                                                         │
-- │  Solution: Call a SECURITY DEFINER function. Because it runs as the     │
-- │  function owner (postgres), RLS is bypassed inside the function body,   │
-- │  so there is NO recursive policy evaluation.                            │
-- └─────────────────────────────────────────────────────────────────────────┘

-- Drop existing helper if it exists so we can cleanly recreate it
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

-- Grant execute to both roles so policies can call it
GRANT EXECUTE ON FUNCTION is_admin() TO anon, authenticated;

-- Drop existing helper if it exists so we can cleanly recreate it
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

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION is_faculty_member() TO authenticated;

ALTER TABLE students             ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty              ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins               ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_summary   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;

-- ── students ──────────────────────────────────────────────────────────────
-- Anonymous users can look up active students (needed for attendance flow)
CREATE POLICY "students_anon_select"
  ON students FOR SELECT TO anon
  USING (TRUE);

-- Any authenticated user can read students
CREATE POLICY "students_auth_select"
  ON students FOR SELECT TO authenticated
  USING (TRUE);

-- Only admins can write (insert/update/delete)
CREATE POLICY "students_admin_write"
  ON students FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── faculty ───────────────────────────────────────────────────────────────
-- Anonymous users can look up faculty by faculty_id/email BEFORE signing in.
-- Required because facultyLogin() calls api.Faculty.findByFacultyId()
-- BEFORE calling auth.signInWithPassword().
CREATE POLICY "faculty_anon_lookup"
  ON faculty FOR SELECT TO anon, authenticated
  USING (TRUE);

-- Faculty can read their own record
CREATE POLICY "faculty_read_own"
  ON faculty FOR SELECT TO authenticated
  USING (auth_id = auth.uid() OR is_admin());

-- Only admins can write faculty records
CREATE POLICY "faculty_admin_write"
  ON faculty FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── admins ────────────────────────────────────────────────────────────────
-- Anonymous users can look up admins by username/email BEFORE signing in.
-- This is required for the adminLogin() flow which calls findByUsername()
-- before calling auth.signInWithPassword().
CREATE POLICY "admins_anon_lookup"
  ON admins FOR SELECT TO anon, authenticated
  USING (TRUE);

-- Authenticated admins can read their own record.
-- Uses auth_id = auth.uid() only — NO self-referential subquery, no recursion.
CREATE POLICY "admins_read_own"
  ON admins FOR SELECT TO authenticated
  USING (auth_id = auth.uid());

-- ── attendance_sessions ───────────────────────────────────────────────────
-- Anonymous read on active sessions (needed for attendance code validation)
CREATE POLICY "sessions_anon_select_active"
  ON attendance_sessions FOR SELECT TO anon
  USING (status = 'active' AND end_time > NOW());

-- Faculty can insert sessions (they are authenticated)
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

-- ── attendance_records ────────────────────────────────────────────────────
-- Anonymous can read records (required for mark_attendance RPC context)
CREATE POLICY "records_anon_select"
  ON attendance_records FOR SELECT TO anon
  USING (TRUE);

-- Any authenticated user can read records
CREATE POLICY "records_auth_select"
  ON attendance_records FOR SELECT TO authenticated
  USING (TRUE);

-- Only admins can modify records via direct table access
CREATE POLICY "records_admin_write"
  ON attendance_records FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── attendance_summary ────────────────────────────────────────────────────
-- Anonymous can read summary (needed for student profile lookups)
CREATE POLICY "summary_anon_select"
  ON attendance_summary FOR SELECT TO anon
  USING (TRUE);

-- Any authenticated user can read summary
CREATE POLICY "summary_auth_select"
  ON attendance_summary FOR SELECT TO authenticated
  USING (TRUE);

-- Only admins can directly modify summary (triggers handle normal updates)
CREATE POLICY "summary_admin_write"
  ON attendance_summary FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── settings ──────────────────────────────────────────────────────────────
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

-- ── audit_logs ────────────────────────────────────────────────────────────
-- Admins can read audit logs
CREATE POLICY "audit_admin_select"
  ON audit_logs FOR SELECT TO authenticated
  USING (is_admin());

-- Any authenticated user or anon RPC can insert audit logs
CREATE POLICY "audit_anon_insert"
  ON audit_logs FOR INSERT TO anon
  WITH CHECK (TRUE);

CREATE POLICY "audit_auth_insert"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (TRUE);

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 5: FUNCTIONS & TRIGGER CODES
-- ───────────────────────────────────────────────────────────────────────────

-- ── Function: register_student ─────────────────────────────────────────────
-- Validates details, enforces mobile uniqueness, inserts student, registers summary row.
-- Definer context allows anonymous student registry without giving insert policies on tables.
CREATE OR REPLACE FUNCTION register_student(
  p_name TEXT,
  p_mobile TEXT,
  p_hall TEXT,
  p_roll TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_student RECORD;
BEGIN
  -- 1. Input validations
  p_name := TRIM(p_name);
  p_mobile := TRIM(p_mobile);
  p_roll := TRIM(p_roll);
  
  IF LENGTH(p_name) < 2 OR LENGTH(p_name) > 100 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Student name must be between 2 and 100 characters.');
  END IF;

  IF NOT p_mobile ~ '^[6-9]\d{9}$' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Mobile number must be a valid 10-digit Indian number.');
  END IF;

  -- 2. Enforce uniqueness check
  IF EXISTS (SELECT 1 FROM students WHERE mobile_number = p_mobile) THEN
    RETURN jsonb_build_object('success', false, 'message', 'This mobile number is already registered. Please use Student Login.');
  END IF;

  -- 3. Perform Insert
  INSERT INTO students (student_name, mobile_number, lecture_hall, roll_number, is_active)
  VALUES (p_name, p_mobile, p_hall, NULLIF(p_roll, ''), TRUE)
  RETURNING * INTO v_new_student;

  -- 4. Set summary row seeds
  INSERT INTO attendance_summary (student_id, present_count, absent_count)
  VALUES (v_new_student.id, 0, 0)
  ON CONFLICT (student_id) DO NOTHING;

  -- 5. Write audit trail
  INSERT INTO audit_logs (action, actor_role, target_type, target_id, details)
  VALUES (
    'STUDENT_REGISTERED',
    'system',
    'student',
    v_new_student.id,
    jsonb_build_object(
      'student_id', v_new_student.student_id,
      'student_name', v_new_student.student_name,
      'lecture_hall', v_new_student.lecture_hall,
      'roll_number', v_new_student.roll_number
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Registration completed successfully.',
    'student', jsonb_build_object(
      'id', v_new_student.id,
      'student_id', v_new_student.student_id,
      'student_name', v_new_student.student_name,
      'mobile_number', v_new_student.mobile_number,
      'lecture_hall', v_new_student.lecture_hall,
      'roll_number', v_new_student.roll_number
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Database insertion failed: ' || SQLERRM);
END;
$$;

-- ── Function: create_attendance_session ────────────────────────────────────
-- Enforces: Active Faculty, Unique Active Session (Date+LH+Slot), generates code inside DB.
DROP FUNCTION IF EXISTS create_attendance_session(TEXT, VARCHAR, UUID, INTEGER);
DROP FUNCTION IF EXISTS create_attendance_session(TEXT, VARCHAR, UUID, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION create_attendance_session(
  p_hall TEXT,
  p_session VARCHAR(10),
  p_faculty_uuid UUID,
  p_window_seconds INTEGER DEFAULT NULL,
  p_window_minutes INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code VARCHAR(4);
  v_now TIMESTAMPTZ := NOW();
  v_end TIMESTAMPTZ;
  v_session_id UUID;
  v_faculty_name TEXT;
BEGIN
  -- 1. Verify Active Faculty
  SELECT faculty_name INTO v_faculty_name FROM faculty WHERE id = p_faculty_uuid AND is_active = TRUE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Faculty account is inactive or not found.');
  END IF;

  -- 2. Verify Session Uniqueness (Date + LH + Session)
  IF EXISTS (
    SELECT 1 FROM attendance_sessions
     WHERE session_date = v_now::DATE
       AND lecture_hall = p_hall
       AND session_label = p_session
       AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Attendance is already active for ' || p_hall || ' Session ' || p_session || '.'
    );
  END IF;

  -- 3. Server-side code generation and expiry calculation
  v_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  IF p_window_seconds IS NOT NULL THEN
    v_end := v_now + (p_window_seconds || ' seconds')::INTERVAL;
  ELSIF p_window_minutes IS NOT NULL THEN
    v_end := v_now + (p_window_minutes || ' minutes')::INTERVAL;
  ELSE
    v_end := v_now + (300 || ' seconds')::INTERVAL; -- fallback to 5 minutes
  END IF;

  -- 4. Insert Session details
  INSERT INTO attendance_sessions (session_date, session_label, lecture_hall, attendance_code, start_time, end_time, status, faculty_id)
  VALUES (v_now::DATE, p_session, p_hall, v_code, v_now, v_end, 'active', p_faculty_uuid)
  RETURNING id INTO v_session_id;

  -- 5. Audit log session start
  INSERT INTO audit_logs (action, actor_id, actor_role, actor_name, target_type, target_id, details)
  VALUES (
    'SESSION_STARTED',
    p_faculty_uuid,
    'faculty',
    v_faculty_name,
    'session',
    v_session_id,
    jsonb_build_object(
      'lecture_hall', p_hall,
      'session_label', p_session,
      'code', v_code,
      'end_time', v_end
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_id', v_session_id,
    'attendance_code', v_code,
    'end_time', v_end
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session creation failed: ' || SQLERRM);
END;
$$;

-- ── Function: refresh_attendance_code ──────────────────────────────────────
-- Verifies session status, checks current DB time against expiry, updates code without extending duration.
CREATE OR REPLACE FUNCTION refresh_attendance_code(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code VARCHAR(4);
  v_sess RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_faculty_name TEXT;
BEGIN
  -- 1. Check & lock session row
  SELECT * INTO v_sess FROM attendance_sessions WHERE id = p_session_id LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Session not found.');
  END IF;

  -- 2. Verify validity
  IF v_sess.status <> 'active' OR v_now > v_sess.end_time THEN
    -- Auto-close session if it was still active but expired
    IF v_sess.status = 'active' THEN
      PERFORM close_session_and_mark_absent(p_session_id);
    END IF;
    RETURN jsonb_build_object('success', false, 'message', 'Session has expired or is closed.');
  END IF;

  -- 3. DB Code Refresh
  v_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  UPDATE attendance_sessions
     SET attendance_code = v_code
   WHERE id = p_session_id;

  -- 4. Load Faculty details for logging
  SELECT faculty_name INTO v_faculty_name FROM faculty WHERE id = v_sess.faculty_id;

  INSERT INTO audit_logs (action, actor_id, actor_role, actor_name, target_type, target_id, details)
  VALUES (
    'CODE_REFRESHED',
    v_sess.faculty_id,
    'faculty',
    COALESCE(v_faculty_name, 'Faculty'),
    'session',
    p_session_id,
    jsonb_build_object(
      'old_code', v_sess.attendance_code,
      'new_code', v_code
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'attendance_code', v_code
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code refresh failed: ' || SQLERRM);
END;
$$;

-- ── Function: reset_faculty_password ──────────────────────────────────────
-- Updates encrypted_password for a user in auth.users by email using pgcrypto.
CREATE OR REPLACE FUNCTION reset_faculty_password(
  p_email TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE auth.users
     SET encrypted_password = crypt(p_new_password, gen_salt('bf'))
   WHERE email = LOWER(TRIM(p_email));
   
  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', 'Password reset failed: ' || SQLERRM);
END;
$$;

-- ── Function: get_admin_dashboard_stats ────────────────────────────────────
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_students INTEGER;
  v_total_faculty INTEGER;
  v_active_sessions INTEGER;
  v_present_today INTEGER;
  v_absent_today INTEGER;
  v_today DATE := NOW()::DATE;
BEGIN
  SELECT COUNT(*) INTO v_total_students FROM students WHERE is_active = TRUE;
  SELECT COUNT(*) INTO v_total_faculty FROM faculty WHERE is_active = TRUE;
  SELECT COUNT(*) INTO v_active_sessions FROM attendance_sessions WHERE status = 'active' AND end_time > NOW();
  
  SELECT COUNT(*) INTO v_present_today FROM attendance_records WHERE session_date = v_today AND status = 'P';
  SELECT COUNT(*) INTO v_absent_today FROM attendance_records WHERE session_date = v_today AND status = 'A';

  RETURN jsonb_build_object(
    'total_students', v_total_students,
    'total_faculty', v_total_faculty,
    'active_sessions', v_active_sessions,
    'present_today', v_present_today,
    'absent_today', v_absent_today,
    'total_today', v_present_today + v_absent_today
  );
END;
$$;

-- ── Function: mark_attendance ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_attendance(
  p_mobile TEXT,
  p_code   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student   RECORD;
  v_session   RECORD;
  v_record_id UUID;
  v_now       TIMESTAMPTZ := NOW();
BEGIN
  -- ── Step 1: Verify student exists ────────────────────────────────────────
  SELECT id, student_id, student_name, mobile_number, lecture_hall, is_active
    INTO v_student
    FROM students
   WHERE mobile_number = p_mobile
   LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO audit_logs (action, actor_role, target_type, details)
    VALUES ('STUDENT_ATTENDANCE_REJECTED', 'system', 'student',
      jsonb_build_object('reason', 'student_not_found', 'mobile', p_mobile));
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'STUDENT_NOT_FOUND',
      'message', 'Mobile number not registered. Please register first.'
    );
  END IF;

  -- ── Step 2: Verify student is active ─────────────────────────────────────
  IF v_student.is_active = FALSE THEN
    INSERT INTO audit_logs (action, actor_role, target_type, target_id, details)
    VALUES ('STUDENT_ATTENDANCE_REJECTED', 'system', 'student', v_student.id,
      jsonb_build_object('reason', 'student_inactive'));
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'STUDENT_INACTIVE',
      'message', 'Student account is inactive. Please contact the administrator.'
    );
  END IF;

  -- ── Step 3: Find active session for student's lecture hall ────────────────
  SELECT id, session_date, session_label, lecture_hall, attendance_code, end_time, status
    INTO v_session
    FROM attendance_sessions
   WHERE lecture_hall = v_student.lecture_hall
     AND status = 'active'
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NO_ACTIVE_SESSION',
      'message', 'No active attendance session for your lecture hall right now.'
    );
  END IF;

  -- ── Step 4: Verify session has not expired ────────────────────────────────
  IF v_now > v_session.end_time THEN
    PERFORM close_session_and_mark_absent(v_session.id);
    INSERT INTO audit_logs (action, actor_role, target_type, target_id, details)
    VALUES ('STUDENT_ATTENDANCE_REJECTED', 'system', 'student', v_student.id,
      jsonb_build_object('reason', 'session_expired', 'session_id', v_session.id));
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SESSION_EXPIRED',
      'message', 'Attendance session has expired. Please contact your instructor.'
    );
  END IF;

  -- ── Step 5: Verify attendance code ────────────────────────────────────────
  IF v_session.attendance_code <> p_code THEN
    INSERT INTO audit_logs (action, actor_role, target_type, target_id, details)
    VALUES ('STUDENT_ATTENDANCE_REJECTED', 'system', 'student', v_student.id,
      jsonb_build_object('reason', 'wrong_code', 'session_id', v_session.id));
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'WRONG_CODE',
      'message', 'Invalid attendance code. Please check and try again.'
    );
  END IF;

  -- ── Step 6: Prevent duplicate attendance ──────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM attendance_records
     WHERE student_id = v_student.id AND session_id = v_session.id
  ) THEN
    INSERT INTO audit_logs (action, actor_role, target_type, target_id, details)
    VALUES ('STUDENT_ATTENDANCE_REJECTED', 'system', 'student', v_student.id,
      jsonb_build_object('reason', 'duplicate_submission', 'session_id', v_session.id));
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_ATTENDANCE',
      'message', 'Attendance already marked for this session.'
    );
  END IF;

  -- ── Step 7: Record attendance (P) ─────────────────────────────────────────
  INSERT INTO attendance_records
    (student_id, session_id, session_date, session_label, lecture_hall, status, code_used, marked_at)
  VALUES
    (v_student.id, v_session.id, v_session.session_date, v_session.session_label,
     v_session.lecture_hall, 'P', p_code, v_now)
  RETURNING id INTO v_record_id;

  -- Step 8 is handled automatically by the trg_sync_attendance_summary trigger!
  -- No manual insertion/update on attendance_summary required here.

  -- ── Step 9: Write audit log ───────────────────────────────────────────────
  INSERT INTO audit_logs (action, actor_role, target_type, target_id, details)
  VALUES (
    'ATTENDANCE_MARKED', 'system', 'student', v_student.id,
    jsonb_build_object(
      'student_id',    v_student.student_id,
      'student_name',  v_student.student_name,
      'session_label', v_session.session_label,
      'lecture_hall',  v_session.lecture_hall,
      'session_date',  v_session.session_date,
      'record_id',     v_record_id,
      'marked_at',     v_now
    )
  );

  RETURN jsonb_build_object(
    'success',       true,
    'error_code',    NULL,
    'message',       'Attendance marked successfully.',
    'student_id',    v_student.student_id,
    'student_name',  v_student.student_name,
    'lecture_hall',  v_student.lecture_hall,
    'session_label', v_session.session_label,
    'session_date',  v_session.session_date,
    'marked_at',     v_now
  );
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO audit_logs (action, actor_role, details)
    VALUES ('SYSTEM_ERROR', 'system',
      jsonb_build_object('context', 'mark_attendance', 'error', SQLERRM));
    RETURN jsonb_build_object(
      'success',    false,
      'error_code', 'SERVER_ERROR',
      'message',    'Unable to connect to the server. Please try again.'
    );
END;
$$;

-- ── Function: close_session_and_mark_absent ────────────────────────────────
CREATE OR REPLACE FUNCTION close_session_and_mark_absent(
  session_uuid UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sess         RECORD;
  absent_count INTEGER := 0;
BEGIN
  SELECT id, session_date, session_label, lecture_hall, status
    INTO sess
    FROM attendance_sessions
   WHERE id = session_uuid AND status = 'active'
   FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'absent_marked', 0, 'note', 'already_closed');
  END IF;

  -- Insert Absent records for active students in this hall not yet marked
  -- Triggers will handle summary updates automatically!
  WITH inserted AS (
    INSERT INTO attendance_records
      (student_id, session_id, session_date, session_label, lecture_hall, status, marked_at)
    SELECT
      s.id, sess.id, sess.session_date, sess.session_label, sess.lecture_hall, 'A', NOW()
    FROM students s
    WHERE s.lecture_hall = sess.lecture_hall
      AND s.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM attendance_records ar
         WHERE ar.student_id = s.id AND ar.session_id = sess.id
      )
    RETURNING student_id
  )
  SELECT COUNT(*) INTO absent_count FROM inserted;

  -- Close the session
  UPDATE attendance_sessions
     SET status = 'closed'
   WHERE id = session_uuid;

  RETURN jsonb_build_object('success', true, 'absent_marked', absent_count);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── Function: trg_fn_sync_summary ──────────────────────────────────────────
-- Unified summary sync trigger function to guarantee complete integrity.
-- Correctly handles INSERT, UPDATE, and DELETE operations.
CREATE OR REPLACE FUNCTION trg_fn_sync_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO attendance_summary (student_id, present_count, absent_count, last_updated)
    VALUES (
      NEW.student_id,
      CASE WHEN NEW.status = 'P' THEN 1 ELSE 0 END,
      CASE WHEN NEW.status = 'A' THEN 1 ELSE 0 END,
      NOW()
    )
    ON CONFLICT (student_id) DO UPDATE
    SET present_count = attendance_summary.present_count + (CASE WHEN NEW.status = 'P' THEN 1 ELSE 0 END),
        absent_count = attendance_summary.absent_count + (CASE WHEN NEW.status = 'A' THEN 1 ELSE 0 END),
        last_updated = NOW();
        
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status <> NEW.status THEN
      UPDATE attendance_summary
         SET present_count = present_count + (CASE WHEN NEW.status = 'P' THEN 1 ELSE 0 END) - (CASE WHEN OLD.status = 'P' THEN 1 ELSE 0 END),
             absent_count = absent_count + (CASE WHEN NEW.status = 'A' THEN 1 ELSE 0 END) - (CASE WHEN OLD.status = 'A' THEN 1 ELSE 0 END),
             last_updated = NOW()
       WHERE student_id = NEW.student_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE attendance_summary
       SET present_count = GREATEST(0, present_count - (CASE WHEN OLD.status = 'P' THEN 1 ELSE 0 END)),
           absent_count = GREATEST(0, absent_count - (CASE WHEN OLD.status = 'A' THEN 1 ELSE 0 END)),
           last_updated = NOW()
     WHERE student_id = OLD.student_id;
  END IF;
  
  RETURN NULL;
END;
$$;

-- ── Function: set_updated_at ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 6: TRIGGERS
-- ───────────────────────────────────────────────────────────────────────────

-- Fires after any INSERT, UPDATE, or DELETE on attendance_records
CREATE TRIGGER trg_sync_attendance_summary
  AFTER INSERT OR UPDATE OR DELETE ON attendance_records
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_sync_summary();

-- Auto-update updated_at on students changes
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Auto-update updated_at on faculty changes
CREATE TRIGGER trg_faculty_updated_at
  BEFORE UPDATE ON faculty
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- SECTION 7: SEED DATA (Default Settings)
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO settings (key, value, description) VALUES
  ('college_name',         'College Smart Attendance System',
   'Institution name displayed across the application'),
  ('academic_year',        '2026–2027',
   'Current academic year'),
  ('attendance_window',    '300',
   'Attendance session duration in seconds (5–3600)'),
  ('low_attendance_threshold', '75',
   'Low attendance alert threshold as a percentage (1–100)'),
  ('default_export_format','xlsx',
   'Default report export format: xlsx | csv'),
  ('system_version',       '2.0.0',
   'Application version (read-only)'),
  ('lecture_halls',        '[{"id":"LH-01","name":"LH-01","status":"active"},{"id":"LH-02","name":"LH-02","status":"active"},{"id":"LH-03","name":"LH-03","status":"active"},{"id":"LH-04","name":"LH-04","status":"active"},{"id":"LH-05","name":"LH-05","status":"active"},{"id":"LH-06","name":"LH-06","status":"active"}]',
   'JSON array of dynamic lecture halls: id, name, status (active|disabled)')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, description = EXCLUDED.description;

-- Seed default Admin mapping (Required for Admin dashboard logins to map public.admins to auth.users)
INSERT INTO admins (auth_id, username, admin_name, email, is_active)
VALUES ('ef0c9500-512a-48b3-a14f-0c80a5890d4f', 'admin', 'Administrator', 'srisailachari07@gmail.com', true)
ON CONFLICT (username) DO NOTHING;

-- ── Function: create_faculty_account ──────────────────────────────────────
-- Atomic transaction that registers both Supabase Auth user and Faculty profile.
DROP FUNCTION IF EXISTS create_faculty_account(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_faculty_account(
  p_name       TEXT,
  p_faculty_id TEXT,
  p_email      TEXT,
  p_password   TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_auth_id    UUID;
  v_faculty    faculty%ROWTYPE;
  v_admin_name TEXT;
BEGIN
  -- Validate inputs
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 2 THEN
    RETURN json_build_object('success', false, 'message', 'Faculty name must be at least 2 characters.');
  END IF;
  
  IF p_faculty_id IS NULL OR LENGTH(TRIM(p_faculty_id)) < 3 THEN
    RETURN json_build_object('success', false, 'message', 'Faculty ID must be at least 3 characters.');
  END IF;
  
  IF p_email IS NULL OR p_email NOT LIKE '%@%' THEN
    RETURN json_build_object('success', false, 'message', 'Invalid email address.');
  END IF;
  
  IF p_password IS NULL OR LENGTH(p_password) < 6 THEN
    RETURN json_build_object('success', false, 'message', 'Password must be at least 6 characters.');
  END IF;

  -- Check if faculty_id already exists
  IF EXISTS (SELECT 1 FROM public.faculty WHERE faculty_id = TRIM(p_faculty_id)) THEN
    RETURN json_build_object('success', false, 'message', 'Faculty ID already registered: ' || TRIM(p_faculty_id));
  END IF;

  -- Check if email already exists in faculty table
  IF EXISTS (SELECT 1 FROM public.faculty WHERE email = LOWER(TRIM(p_email))) THEN
    RETURN json_build_object('success', false, 'message', 'Email already registered to faculty: ' || LOWER(TRIM(p_email)));
  END IF;

  -- Check if email already exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = LOWER(TRIM(p_email))) THEN
    -- If it belongs to an admin, reject it
    IF EXISTS (SELECT 1 FROM public.admins WHERE email = LOWER(TRIM(p_email))) THEN
      RETURN json_build_object('success', false, 'message', 'Email is registered to an administrator account.');
    END IF;

    -- Otherwise, it is an orphan! Delete it from auth.users to make room for fresh registration
    DELETE FROM auth.users WHERE email = LOWER(TRIM(p_email));
  END IF;

  -- Generate a new UUID for the auth user
  v_auth_id := gen_random_uuid();

  -- Insert directly into auth.users (bypasses email confirmation entirely)
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    v_auth_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    LOWER(TRIM(p_email)),
    crypt(p_password, gen_salt('bf')),
    NOW(),
    json_build_object('provider', 'email', 'providers', ARRAY['email']),
    json_build_object('role', 'faculty', 'name', TRIM(p_name)),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  );

  -- Insert into public.faculty table
  INSERT INTO public.faculty (
    auth_id,
    faculty_name,
    faculty_id,
    email,
    is_active
  )
  VALUES (
    v_auth_id,
    TRIM(p_name),
    TRIM(p_faculty_id),
    LOWER(TRIM(p_email)),
    TRUE
  )
  RETURNING * INTO v_faculty;

  -- Get logged-in administrator's name for audit trail
  SELECT admin_name INTO v_admin_name
    FROM public.admins
   WHERE auth_id = auth.uid();

  IF v_admin_name IS NULL THEN
    v_admin_name := 'Administrator';
  END IF;

  -- Write to audit logs table
  INSERT INTO public.audit_logs (
    action,
    actor_id,
    actor_role,
    actor_name,
    target_type,
    target_id,
    details
  )
  VALUES (
    'FACULTY_UPDATED',
    auth.uid(),
    'admin',
    v_admin_name,
    'faculty',
    v_faculty.id,
    jsonb_build_object(
      'faculty_id',   v_faculty.faculty_id,
      'email',        v_faculty.email,
      'action',       'created'
    )
  );

  RETURN json_build_object(
    'success', true,
    'faculty', json_build_object(
      'id',           v_faculty.id,
      'auth_id',      v_faculty.auth_id,
      'faculty_name', v_faculty.faculty_name,
      'faculty_id',   v_faculty.faculty_id,
      'email',        v_faculty.email,
      'is_active',    v_faculty.is_active
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION create_faculty_account(TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 2: DATABASE SCALABILITY INDEXES
--    Create unique and composite indexes to support 1000+ concurrent users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_roll_number ON public.students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_lecture_hall ON public.students(lecture_hall);
CREATE INDEX IF NOT EXISTS idx_records_student_id ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_records_session_id ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_composite ON public.attendance_sessions(lecture_hall, faculty_id, session_date, status);
CREATE INDEX IF NOT EXISTS idx_summary_student_id ON public.attendance_summary(student_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 3: SYSTEM_ARCHIVE placeholder faculty profile
--    This account preserves FK references when a real faculty is deleted.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.faculty (
  id,
  faculty_id,
  faculty_name,
  email,
  is_active,
  auth_id,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'SYSTEM_ARCHIVE',
  'Deleted Faculty',
  'system-archive@smartattend.internal',
  false,
  null,
  now()
) ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 4: RPC: delete_faculty_permanently
--    Removes a single faculty member, reassigning historical data.
--    SECURITY DEFINER required — runs under postgres bypass context.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_faculty_permanently(p_faculty_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  -- Security check: Only active admins can permanently delete faculty profiles
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin privileges required.');
  END IF;

  -- A. Fetch auth_id
  SELECT auth_id INTO v_auth_id 
  FROM public.faculty 
  WHERE id = p_faculty_id;

  -- B. Delete active sessions of this faculty
  DELETE FROM public.attendance_sessions 
  WHERE faculty_id = p_faculty_id AND status = 'active';

  -- C. Reassign historical sessions to SYSTEM_ARCHIVE
  UPDATE public.attendance_sessions 
  SET faculty_id = '00000000-0000-0000-0000-000000000001'::uuid 
  WHERE faculty_id = p_faculty_id;

  -- D. Delete the faculty profile
  DELETE FROM public.faculty 
  WHERE id = p_faculty_id;

  -- E. Delete the auth.users account if it exists
  IF v_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_id;
  END IF;

  RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 5: RPC: delete_multiple_faculty
--    Removes a list of faculty members in a single transaction.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_multiple_faculty(p_faculty_ids uuid[])
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_fid UUID;
  v_auth_id UUID;
BEGIN
  -- Security check: Only active admins can bulk delete faculty profiles
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin privileges required.');
  END IF;

  FOREACH v_fid IN ARRAY p_faculty_ids LOOP
    -- A. Fetch auth_id
    SELECT auth_id INTO v_auth_id 
    FROM public.faculty 
    WHERE id = v_fid;

    -- B. Delete active sessions of this faculty
    DELETE FROM public.attendance_sessions 
    WHERE faculty_id = v_fid AND status = 'active';

    -- C. Reassign historical sessions to SYSTEM_ARCHIVE
    UPDATE public.attendance_sessions 
    SET faculty_id = '00000000-0000-0000-0000-000000000001'::uuid 
    WHERE faculty_id = v_fid;

    -- D. Delete the faculty profile
    DELETE FROM public.faculty 
    WHERE id = v_fid;

    -- E. Delete the auth.users account if it exists
    IF v_auth_id IS NOT NULL THEN
      DELETE FROM auth.users WHERE id = v_auth_id;
    END IF;
  END LOOP;

  RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 6: RPC: bulk_import_students
--    Accepts JSONB students roster and executes transactional import.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bulk_import_students(p_students jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student jsonb;
  v_inserted_count INT := 0;
  v_row_index INT := 0;
  v_roll_number TEXT;
  v_name TEXT;
  v_mobile TEXT;
  v_hall TEXT;
  v_uuid UUID;
BEGIN
  -- Security check: Only active admins can import student rosters
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin privileges required.');
  END IF;

  FOR v_student IN SELECT * FROM jsonb_array_elements(p_students) LOOP
    v_row_index := v_row_index + 1;
    v_roll_number := NULLIF(TRIM(v_student->>'roll_number'), '');
    v_name := NULLIF(TRIM(v_student->>'student_name'), '');
    v_mobile := NULLIF(TRIM(v_student->>'mobile_number'), '');
    v_hall := NULLIF(TRIM(v_student->>'lecture_hall'), '');

    -- Validate roll_number not null/empty
    IF v_roll_number IS NULL THEN
      RAISE EXCEPTION 'Row %: University Roll Number is mandatory.', v_row_index;
    END IF;

    -- Validate name
    IF v_name IS NULL THEN
      RAISE EXCEPTION 'Row % (Roll Number %): Student Name is mandatory.', v_row_index, v_roll_number;
    END IF;

    -- Validate mobile
    IF v_mobile IS NULL THEN
      RAISE EXCEPTION 'Row % (Roll Number %): Mobile Number is mandatory.', v_row_index, v_roll_number;
    END IF;

    -- Validate lecture hall
    IF v_hall IS NULL THEN
      RAISE EXCEPTION 'Row % (Roll Number %): Lecture Hall is mandatory.', v_row_index, v_roll_number;
    END IF;

    -- Validate duplicate roll_number in database
    IF EXISTS (SELECT 1 FROM public.students WHERE UPPER(TRIM(roll_number)) = UPPER(v_roll_number)) THEN
      RAISE EXCEPTION 'Row %: University Roll Number "%" already registered in database.', v_row_index, v_roll_number;
    END IF;

    -- Validate duplicate mobile in database
    IF EXISTS (SELECT 1 FROM public.students WHERE mobile_number = v_mobile) THEN
      RAISE EXCEPTION 'Row %: Mobile number "%" already registered in database.', v_row_index, v_mobile;
    END IF;

    -- Insert student profile
    INSERT INTO public.students (student_name, mobile_number, lecture_hall, roll_number, is_active)
    VALUES (v_name, v_mobile, v_hall, v_roll_number, TRUE)
    RETURNING id INTO v_uuid;

    -- Seed attendance summary row
    INSERT INTO public.attendance_summary (student_id, present_count, absent_count)
    VALUES (v_uuid, 0, 0);

    -- Write audit trail log entry
    INSERT INTO public.audit_logs (action, actor_role, target_type, target_id, details)
    VALUES ('STUDENT_REGISTERED', 'admin', 'student', v_uuid, jsonb_build_object(
      'roll_number', v_roll_number,
      'student_name', v_name,
      'lecture_hall', v_hall,
      'import_type', 'bulk'
    ));

    v_inserted_count := v_inserted_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'inserted_count', v_inserted_count
  );

EXCEPTION WHEN OTHERS THEN
  -- Transaction automatically rolls back on exception RAISE
  RETURN json_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 7: RPC: reset_all_faculty
--    Deletes all faculty profiles and auth users (except SYSTEM_ARCHIVE)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_all_faculty()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_ids UUID[];
  v_auth_id UUID;
BEGIN
  -- Security check: Only active admins can wipe faculty registry
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin privileges required.');
  END IF;

  -- A. Fetch all auth_ids of non-admin users in auth.users (including orphans)
  SELECT array_agg(id) INTO v_auth_ids 
  FROM auth.users 
  WHERE id NOT IN (
    SELECT auth_id FROM public.admins WHERE auth_id IS NOT NULL
  );

  -- B. Delete active sessions
  DELETE FROM public.attendance_sessions WHERE status = 'active';

  -- C. Reassign historical sessions to SYSTEM_ARCHIVE
  UPDATE public.attendance_sessions 
  SET faculty_id = '00000000-0000-0000-0000-000000000001'::uuid
  WHERE id IS NOT NULL;

  -- D. Delete all faculty profiles except SYSTEM_ARCHIVE
  DELETE FROM public.faculty WHERE faculty_id <> 'SYSTEM_ARCHIVE';

  -- E. Delete all non-admin auth.users accounts
  IF v_auth_ids IS NOT NULL THEN
    FOREACH v_auth_id IN ARRAY v_auth_ids LOOP
      DELETE FROM auth.users WHERE id = v_auth_id;
    END LOOP;
  END IF;

  RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 8: RPC: reset_all_students
--    Deletes all student profiles, cascading to attendance summaries and records.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_all_students()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Security check: Only active admins can wipe student registry
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin privileges required.');
  END IF;

  -- Cascades delete to summaries and records automatically
  DELETE FROM public.students WHERE id IS NOT NULL;
  RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 9: RPC: mark_attendance
--    Accepts Roll Number and validates checks.
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.mark_attendance(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.mark_attendance(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.mark_attendance(
  p_roll_number TEXT,
  p_code        TEXT,
  p_device_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student   RECORD;
  v_session   RECORD;
  v_record_id UUID;
  v_now       TIMESTAMPTZ := NOW();
BEGIN
  -- A. Verify student exists by University Roll Number (case-insensitive lookup)
  SELECT id, roll_number, student_name, lecture_hall, is_active, device_id
    INTO v_student
    FROM students
   WHERE UPPER(TRIM(roll_number)) = UPPER(TRIM(p_roll_number))
   LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO audit_logs (action, actor_role, target_type, details)
    VALUES ('STUDENT_ATTENDANCE_REJECTED', 'system', 'student',
      jsonb_build_object('reason', 'student_not_found', 'roll_number', p_roll_number));
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'STUDENT_NOT_FOUND',
      'message', 'Student ID/Roll Number not registered. Please contact the administrator.'
    );
  END IF;

  -- B. Verify student is active
  IF v_student.is_active = FALSE THEN
    INSERT INTO audit_logs (action, actor_role, target_type, target_id, details)
    VALUES ('STUDENT_ATTENDANCE_REJECTED', 'system', 'student', v_student.id,
      jsonb_build_object('reason', 'student_inactive', 'roll_number', p_roll_number));
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'STUDENT_INACTIVE',
      'message', 'Student account is inactive. Please contact the administrator.'
    );
  END IF;

  -- C. Find active session for student's lecture hall
  SELECT id, session_date, session_label, lecture_hall, attendance_code, end_time, status
    INTO v_session
    FROM attendance_sessions
   WHERE lecture_hall = v_student.lecture_hall
     AND status = 'active'
   ORDER BY created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NO_ACTIVE_SESSION',
      'message', 'No active attendance session for your lecture hall right now.'
    );
  END IF;

  -- D. Verify session has not expired
  IF v_now > v_session.end_time THEN
    PERFORM close_session_and_mark_absent(v_session.id);
    INSERT INTO audit_logs (action, actor_role, target_type, target_id, details)
    VALUES ('STUDENT_ATTENDANCE_REJECTED', 'system', 'student', v_student.id,
      jsonb_build_object('reason', 'session_expired', 'session_id', v_session.id));
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SESSION_EXPIRED',
      'message', 'Attendance session has expired. Please contact your instructor.'
    );
  END IF;

  -- E. Verify attendance code
  IF v_session.attendance_code <> p_code THEN
    INSERT INTO audit_logs (action, actor_role, target_type, target_id, details)
    VALUES ('STUDENT_ATTENDANCE_REJECTED', 'system', 'student', v_student.id,
      jsonb_build_object('reason', 'wrong_code', 'session_id', v_session.id));
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'WRONG_CODE',
      'message', 'Invalid attendance code. Please check and try again.'
    );
  END IF;

  -- F. Prevent duplicate attendance
  IF EXISTS (
    SELECT 1 FROM attendance_records
     WHERE student_id = v_student.id AND session_id = v_session.id
  ) THEN
    INSERT INTO audit_logs (action, actor_role, target_type, target_id, details)
    VALUES ('STUDENT_ATTENDANCE_REJECTED', 'system', 'student', v_student.id,
      jsonb_build_object('reason', 'duplicate_submission', 'session_id', v_session.id));
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DUPLICATE_ATTENDANCE',
      'message', 'Attendance already marked for this session.'
    );
  END IF;

  -- G. Validate Device Lock (Proxy check)
  -- 1. Check if the device is already bound to another student in this session
  IF EXISTS (
    SELECT 1 FROM attendance_records
     WHERE session_id = v_session.id
       AND device_hash = p_device_hash
       AND student_id <> v_student.id
  ) THEN
    INSERT INTO audit_logs (action, actor_role, target_type, target_id, details)
    VALUES ('STUDENT_ATTENDANCE_REJECTED', 'system', 'student', v_student.id,
      jsonb_build_object('reason', 'device_already_used', 'session_id', v_session.id, 'device_hash', p_device_hash));
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DEVICE_LOCK_ERROR',
      'message', 'This device has already been used to submit attendance for another student in this session.'
    );
  END IF;

  -- 2. Verify student's bound device_id matches
  IF v_student.device_id IS NOT NULL AND v_student.device_id <> p_device_hash THEN
    INSERT INTO audit_logs (action, actor_role, target_type, target_id, details)
    VALUES ('STUDENT_ATTENDANCE_REJECTED', 'system', 'student', v_student.id,
      jsonb_build_object('reason', 'device_mismatch', 'session_id', v_session.id, 'device_hash', p_device_hash, 'expected_device', v_student.device_id));
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'DEVICE_LOCK_ERROR',
      'message', 'This account is bound to another device. Please request a device reset from the administrator.'
    );
  END IF;

  -- H. Record attendance (P)
  INSERT INTO attendance_records
    (student_id, session_id, session_date, session_label, lecture_hall, status, code_used, device_hash, marked_at)
  VALUES
    (v_student.id, v_session.id, v_session.session_date, v_session.session_label,
     v_session.lecture_hall, 'P', p_code, p_device_hash, v_now)
  RETURNING id INTO v_record_id;

  -- I. Bind device if not bound
  IF v_student.device_id IS NULL THEN
    UPDATE students SET device_id = p_device_hash WHERE id = v_student.id;
  END IF;

  -- J. Write audit log
  INSERT INTO audit_logs (action, actor_role, target_type, target_id, details)
  VALUES (
    'ATTENDANCE_MARKED', 'system', 'student', v_student.id,
    jsonb_build_object(
      'roll_number',   v_student.roll_number,
      'student_name',  v_student.student_name,
      'session_label', v_session.session_label,
      'lecture_hall',  v_session.lecture_hall,
      'session_date',  v_session.session_date,
      'record_id',     v_record_id,
      'device_hash',   p_device_hash,
      'marked_at',     v_now
    )
  );

  RETURN jsonb_build_object(
    'success',       true,
    'error_code',    NULL,
    'message',       'Attendance marked successfully.',
    'session_id',    v_session.id,
    'roll_number',   v_student.roll_number,
    'student_name',  v_student.student_name,
    'lecture_hall',  v_student.lecture_hall,
    'session_label', v_session.session_label,
    'session_date',  v_session.session_date,
    'marked_at',     v_now
  );
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO audit_logs (action, actor_role, details)
    VALUES ('SYSTEM_ERROR', 'system',
      jsonb_build_object('context', 'mark_attendance', 'error', SQLERRM));
    RETURN jsonb_build_object(
      'success',    false,
      'error_code', 'SERVER_ERROR',
      'message',    'Unable to connect to the server. Please try again.'
    );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 10: RPC: override_student_attendance
--    Faculty Manual Overrides: toggles student status to Present (P) or Absent (A).
-- ─────────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.override_student_attendance(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.override_student_attendance(UUID, UUID, VARCHAR(1), TEXT);

CREATE OR REPLACE FUNCTION public.override_student_attendance(
  p_session_id UUID,
  p_student_id UUID,
  p_status     VARCHAR(1),
  p_reason     TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_faculty_id UUID;
  v_roll_number TEXT;
  v_student_name TEXT;
  v_status CHAR(1);
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- A. Security check: Only Session Owner or Administrator
  IF NOT public.is_admin() THEN
    SELECT faculty_id INTO v_faculty_id FROM public.attendance_sessions WHERE id = p_session_id;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'message', 'Attendance session not found.');
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM public.faculty 
      WHERE id = v_faculty_id AND auth_id = auth.uid()
    ) THEN
      RETURN json_build_object('success', false, 'message', 'Unauthorized: Only the session owner or an administrator can override attendance.');
    END IF;
  END IF;

  -- B. Fetch student details
  SELECT roll_number, student_name INTO v_roll_number, v_student_name 
  FROM public.students WHERE id = p_student_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Student not found.');
  END IF;

  -- Validate p_status
  IF p_status <> 'P' AND p_status <> 'A' THEN
    RETURN json_build_object('success', false, 'message', 'Invalid status. Must be P or A.');
  END IF;

  -- C. Fetch existing attendance record status
  SELECT status INTO v_status 
  FROM public.attendance_records 
  WHERE student_id = p_student_id AND session_id = p_session_id;

  -- D. Apply manual override
  IF FOUND THEN
    IF v_status = p_status THEN
      RETURN json_build_object('success', true, 'message', 'Student is already marked with this status.');
    END IF;

    -- Update existing record
    UPDATE public.attendance_records
    SET status = p_status, marked_at = v_now, code_used = 'MAN'
    WHERE student_id = p_student_id AND session_id = p_session_id;
  ELSE
    -- Insert new record
    INSERT INTO public.attendance_records
      (student_id, session_id, session_date, session_label, lecture_hall, status, code_used, marked_at)
    SELECT s.id, sess.id, sess.session_date, sess.session_label, sess.lecture_hall, p_status, 'MAN', v_now
    FROM public.students s, public.attendance_sessions sess
    WHERE s.id = p_student_id AND sess.id = p_session_id;
  END IF;

  -- E. Log Audit Entry
  INSERT INTO public.audit_logs (action, actor_role, target_type, target_id, details)
  VALUES (
    CASE WHEN p_status = 'P' THEN 'ATTENDANCE_MARKED'::varchar ELSE 'STUDENT_ATTENDANCE_REJECTED'::varchar END,
    CASE WHEN public.is_admin() THEN 'admin'::varchar ELSE 'faculty'::varchar END,
    'student',
    p_student_id,
    jsonb_build_object(
      'override', true,
      'session_id', p_session_id,
      'roll_number', v_roll_number,
      'student_name', v_student_name,
      'previous_status', COALESCE(v_status::text, 'ABSENT'),
      'new_status', p_status,
      'reason', p_reason,
      'actor_id', auth.uid()
    )
  );

  RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 11: RPC: reset_student_device
--    Administrator resets bound device_id of a student profile.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.reset_student_device(p_student_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_roll_number TEXT;
  v_old_device TEXT;
BEGIN
  -- A. Security check: Only Administrators
  IF NOT public.is_admin() THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin privileges required.');
  END IF;

  -- B. Fetch student details
  SELECT roll_number, device_id INTO v_roll_number, v_old_device
  FROM public.students WHERE id = p_student_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Student not found.');
  END IF;

  -- C. Reset device
  UPDATE public.students 
  SET device_id = NULL 
  WHERE id = p_student_id;

  -- D. Log audit entry
  INSERT INTO public.audit_logs (action, actor_role, target_type, target_id, details)
  VALUES (
    'STUDENT_UPDATED',
    'admin',
    'student',
    p_student_id,
    jsonb_build_object(
      'device_reset', true,
      'roll_number', v_roll_number,
      'previous_device_id', v_old_device,
      'actor_id', auth.uid()
    )
  );

  RETURN json_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 12: EXECUTION GRANTS & RELOAD SCHEMA CACHE
-- ─────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.delete_faculty_permanently(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_multiple_faculty(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_import_students(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_all_faculty() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_all_students() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_attendance(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.override_student_attendance(UUID, UUID, VARCHAR, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_student_device(UUID) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 13: ADMIN STATISTICS FUNCTIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Students Page Stats
DROP FUNCTION IF EXISTS get_admin_students_stats();
CREATE OR REPLACE FUNCTION get_admin_students_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_active INTEGER;
  v_inactive INTEGER;
  v_present_today INTEGER;
  v_absent_today INTEGER;
  v_attendance_pct NUMERIC(5,2);
  v_today DATE := NOW()::DATE;
BEGIN
  SELECT COUNT(*) INTO v_total FROM students;
  SELECT COUNT(*) INTO v_active FROM students WHERE is_active = TRUE;
  SELECT COUNT(*) INTO v_inactive FROM students WHERE is_active = FALSE;
  
  SELECT COUNT(*) INTO v_present_today FROM attendance_records WHERE session_date = v_today AND status = 'P';
  SELECT COUNT(*) INTO v_absent_today FROM attendance_records WHERE session_date = v_today AND status = 'A';
  
  IF (v_present_today + v_absent_today) = 0 THEN
    v_attendance_pct := 0.00;
  ELSE
    v_attendance_pct := ROUND((v_present_today::NUMERIC / (v_present_today + v_absent_today)) * 100, 2);
  END IF;

  RETURN jsonb_build_object(
    'total_students', v_total,
    'active_students', v_active,
    'inactive_students', v_inactive,
    'today_attendance_pct', v_attendance_pct
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_students_stats() TO anon, authenticated;

-- 2. Faculty Page Stats (Purges SYSTEM_ARCHIVE virtual profile from counts)
DROP FUNCTION IF EXISTS get_admin_faculty_stats();
CREATE OR REPLACE FUNCTION get_admin_faculty_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_active INTEGER;
  v_taking_sessions INTEGER;
  v_today_sessions INTEGER;
  v_today DATE := NOW()::DATE;
BEGIN
  SELECT COUNT(*) INTO v_total FROM faculty WHERE faculty_id <> 'SYSTEM_ARCHIVE';
  SELECT COUNT(*) INTO v_active FROM faculty WHERE is_active = TRUE AND faculty_id <> 'SYSTEM_ARCHIVE';
  SELECT COUNT(DISTINCT faculty_id) INTO v_taking_sessions FROM attendance_sessions WHERE status = 'active' AND end_time > NOW();
  SELECT COUNT(*) INTO v_today_sessions FROM attendance_sessions WHERE session_date = v_today;

  RETURN jsonb_build_object(
    'total_faculty', v_total,
    'active_faculty', v_active,
    'faculty_taking_sessions', v_taking_sessions,
    'today_sessions', v_today_sessions
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_faculty_stats() TO anon, authenticated;

-- 3. Attendance Page Stats
DROP FUNCTION IF EXISTS get_admin_attendance_stats();
CREATE OR REPLACE FUNCTION get_admin_attendance_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_sessions INTEGER;
  v_active_sessions INTEGER;
  v_submitted INTEGER;
  v_pending INTEGER := 0;
  v_rec RECORD;
  v_hall_count INTEGER;
  v_present_count INTEGER;
  v_today DATE := NOW()::DATE;
BEGIN
  SELECT COUNT(*) INTO v_today_sessions FROM attendance_sessions WHERE session_date = v_today;
  SELECT COUNT(*) INTO v_active_sessions FROM attendance_sessions WHERE status = 'active' AND end_time > NOW();
  SELECT COUNT(*) INTO v_submitted FROM attendance_records WHERE session_date = v_today;
  
  -- Calculate pending students across all currently active sessions
  FOR v_rec IN 
    SELECT id, lecture_hall 
    FROM attendance_sessions 
    WHERE status = 'active' AND end_time > NOW()
  LOOP
    SELECT COUNT(*) INTO v_hall_count 
    FROM students 
    WHERE lecture_hall = v_rec.lecture_hall AND is_active = TRUE;
    
    SELECT COUNT(*) INTO v_present_count 
    FROM attendance_records 
    WHERE session_id = v_rec.id AND status = 'P';
    
    v_pending := v_pending + GREATEST(0, v_hall_count - v_present_count);
  END LOOP;

  RETURN jsonb_build_object(
    'today_sessions', v_today_sessions,
    'active_sessions', v_active_sessions,
    'attendance_submitted', v_submitted,
    'pending_students', v_pending
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_attendance_stats() TO anon, authenticated;

-- 4. Reports Page Stats
DROP FUNCTION IF EXISTS get_admin_reports_stats();
CREATE OR REPLACE FUNCTION get_admin_reports_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overall_pct NUMERIC(5,2);
  v_monthly_count INTEGER;
  v_today_records INTEGER;
  v_export_count INTEGER;
  v_today DATE := NOW()::DATE;
BEGIN
  SELECT COALESCE(AVG(attendance_percentage), 0.00) INTO v_overall_pct FROM attendance_summary;
  SELECT COUNT(DISTINCT session_date) INTO v_monthly_count FROM attendance_sessions WHERE session_date >= (NOW() - INTERVAL '30 days')::DATE;
  SELECT COUNT(*) INTO v_today_records FROM attendance_records WHERE session_date = v_today;
  SELECT COUNT(*) INTO v_export_count FROM audit_logs WHERE action = 'REPORT_GENERATED';

  RETURN jsonb_build_object(
    'overall_attendance_pct', ROUND(v_overall_pct, 2),
    'monthly_reports_count', v_monthly_count,
    'today_records_count', v_today_records,
    'export_count', v_export_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_reports_stats() TO anon, authenticated;

-- Force PostgREST schema cache reload immediately
NOTIFY pgrst, 'reload schema';
