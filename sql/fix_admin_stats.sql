-- ═══════════════════════════════════════════════════════════════════════════
-- SmartAttend v2.0 — ADMIN STATS RPCs
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

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

GRANT EXECUTE ON FUNCTION get_admin_students_stats() TO authenticated;

-- 2. Faculty Page Stats
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

GRANT EXECUTE ON FUNCTION get_admin_faculty_stats() TO authenticated;

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
  -- Loop
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

GRANT EXECUTE ON FUNCTION get_admin_attendance_stats() TO authenticated;

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

GRANT EXECUTE ON FUNCTION get_admin_reports_stats() TO authenticated;
