-- ═══════════════════════════════════════════════════════════════════════════
-- SmartAttend v2.0 — Final Student & Faculty Management Support Patches
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────
-- PART 1: DATABASE CONSTRAINTS & COLUMNS
--    Alter students and attendance_records to add device binding columns
--    and enforce Roll Number constraints.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS device_id VARCHAR(64) NULL;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS device_hash VARCHAR(64) NULL;

-- Clean up any NULL or empty roll numbers in students table
UPDATE public.students 
SET roll_number = student_id 
WHERE roll_number IS NULL OR TRIM(roll_number) = '';

-- Enforce roll_number NOT NULL
ALTER TABLE public.students ALTER COLUMN roll_number SET NOT NULL;

-- Enforce roll_number UNIQUE constraint
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS uq_students_roll_number;
ALTER TABLE public.students ADD CONSTRAINT uq_students_roll_number UNIQUE (roll_number);

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

-- Force PostgREST schema cache reload immediately
NOTIFY pgrst, 'reload schema';
