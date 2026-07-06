-- 1. Alter students table to make mobile_number nullable and drop unique constraint
ALTER TABLE public.students ALTER COLUMN mobile_number DROP NOT NULL;
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_mobile_number_key;

-- 2. Update register_student function
CREATE OR REPLACE FUNCTION public.register_student(
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
  -- Input validations
  p_name := TRIM(p_name);
  p_mobile := NULLIF(TRIM(p_mobile), '');
  p_roll := TRIM(p_roll);
  
  IF LENGTH(p_name) < 2 OR LENGTH(p_name) > 100 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Student name must be between 2 and 100 characters.');
  END IF;

  -- Only validate mobile if it is provided
  IF p_mobile IS NOT NULL THEN
    IF NOT p_mobile ~ '^[6-9]\d{9}$' THEN
      RETURN jsonb_build_object('success', false, 'message', 'Mobile number must be a valid 10-digit Indian number.');
    END IF;
    IF EXISTS (SELECT 1 FROM public.students WHERE mobile_number = p_mobile) THEN
      RETURN jsonb_build_object('success', false, 'message', 'This mobile number is already registered.');
    END IF;
  END IF;

  -- Perform Insert
  INSERT INTO public.students (student_name, mobile_number, lecture_hall, roll_number, is_active)
  VALUES (p_name, p_mobile, p_hall, NULLIF(p_roll, ''), TRUE)
  RETURNING * INTO v_new_student;

  -- Set summary row seeds
  INSERT INTO public.attendance_summary (student_id, present_count, absent_count)
  VALUES (v_new_student.id, 0, 0)
  ON CONFLICT (student_id) DO NOTHING;

  -- Write audit trail
  INSERT INTO public.audit_logs (action, actor_role, target_type, target_id, details)
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
END;
$$;

-- 3. Update bulk_import_students function
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

    -- Validate lecture hall
    IF v_hall IS NULL THEN
      RAISE EXCEPTION 'Row % (Roll Number %): Lecture Hall is mandatory.', v_row_index, v_roll_number;
    END IF;

    -- Validate duplicate roll_number in database
    IF EXISTS (SELECT 1 FROM public.students WHERE UPPER(TRIM(roll_number)) = UPPER(v_roll_number)) THEN
      RAISE EXCEPTION 'Row %: University Roll Number "%" already registered in database.', v_row_index, v_roll_number;
    END IF;

    -- Only validate duplicate mobile in database if it is provided
    IF v_mobile IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM public.students WHERE mobile_number = v_mobile) THEN
        RAISE EXCEPTION 'Row %: Mobile number "%" already registered in database.', v_row_index, v_mobile;
      END IF;
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
