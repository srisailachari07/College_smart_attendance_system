-- ═══════════════════════════════════════════════════════════════════════════
-- SmartAttend v2.0 — FACULTY CREATION FIX
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ROOT CAUSE: Faculty creation fails with FK violation (23503) because:
--
-- 1. The frontend calls tempClient.auth.signUp() which creates an auth user
--    BUT if email confirmation is required, the user is UNCONFIRMED.
--    The auth_id UUID is valid but Supabase may restrict it depending on
--    the email confirmation setting.
--
-- 2. More critically: The direct INSERT into faculty table uses the anon key
--    client with auth_id from signUp. The FK check against auth.users requires
--    the user to exist AND be confirmed in some Supabase versions.
--
-- SOLUTION: Create a SECURITY DEFINER RPC function that:
--   a) Creates the auth user using auth.users directly (as postgres role)
--   b) Immediately inserts the faculty record in the same transaction
--   c) Returns the created faculty record
--
-- This completely bypasses email confirmation issues and runs atomically.
-- ═══════════════════════════════════════════════════════════════════════════

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
    RETURN json_build_object('success', false, 'message', 'Email already registered: ' || LOWER(TRIM(p_email)));
  END IF;

  -- Check if email already exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = LOWER(TRIM(p_email))) THEN
    RETURN json_build_object('success', false, 'message', 'An account with this email already exists.');
  END IF;

  -- Generate a new UUID for the auth user
  v_auth_id := gen_random_uuid();

  -- Insert directly into auth.users (bypasses email confirmation entirely)
  -- email_confirmed_at is set to NOW() so user can log in immediately
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
    NOW(),                                          -- confirmed immediately
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

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'message', 'A faculty member with this ID or email already exists.');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Faculty creation failed: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION create_faculty_account(TEXT, TEXT, TEXT, TEXT) TO authenticated;
