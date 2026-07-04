const SUPABASE_URL = 'https://gvgaafrfwclmppuqqvac.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Z2FhZnJmd2NsbXBwdXFxdmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODg0MTksImV4cCI6MjA5NDk2NDQxOX0.aXdZDpv_D9ZiEzEK2wCkP6fEbnLLSBbPsg0VbZEM1uk';

async function run() {
  console.log('=== LOGGING IN AS ADMIN ===');
  let token;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: 'srisailachari07@gmail.com', password: 'Sai@123' })
    });
    const body = await res.json();
    token = body.access_token;
  } catch (err) {
    console.error('Login error:', err);
    return;
  }

  if (!token) {
    console.log('Login failed.');
    return;
  }

  console.log('=== STEP 1: CLEANING UP ANY EXISTING DUMMY STUDENT ===');
  let existingStudentId;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?mobile_number=eq.9999999999&select=id`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    const body = await res.json();
    if (body.length > 0) {
      existingStudentId = body[0].id;
      console.log('Found existing dummy student:', existingStudentId);
      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${existingStudentId}`, {
        method: 'DELETE',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('Cleanup delete status:', delRes.status);
    }
  } catch (err) {
    console.error('Cleanup error:', err);
  }

  console.log('=== STEP 2: CREATING NEW DUMMY STUDENT ===');
  let studentId;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        student_name: 'Delete Test Student',
        mobile_number: '9999999999',
        lecture_hall: 'LH-01',
        roll_number: 'TESTDELETE01'
      })
    });
    const body = await res.json();
    console.log('Creation Status:', res.status);
    if (body.length > 0) {
      studentId = body[0].id;
      console.log('Created Student UUID:', studentId);
    }
  } catch (err) {
    console.error('Creation Error:', err);
    return;
  }

  if (!studentId) {
    console.log('Student creation failed.');
    return;
  }

  console.log('=== STEP 3: CREATING DUMMY SESSIONS & RECORDS TO CONSTRAIN DELETION ===');
  // Let's find an active session first
  let sessionId;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance_sessions?select=id&limit=1`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    const body = await res.json();
    if (body.length > 0) {
      sessionId = body[0].id;
      console.log('Found session to link record to:', sessionId);
    }
  } catch (err) {
    console.error('Session fetch error:', err);
  }

  if (sessionId) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance_records`, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student_id: studentId,
          session_id: sessionId,
          session_date: new Date().toISOString().split('T')[0],
          lecture_hall: 'LH-01',
          status: 'present'
        })
      });
      console.log('Linked Attendance Record creation status:', res.status);
    } catch (err) {
      console.error('Record creation error:', err);
    }
  }

  console.log('=== STEP 4: DELETING STUDENT PROFILE ===');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/students?id=eq.${studentId}`, {
      method: 'DELETE',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Prefer': 'return=representation'
      }
    });
    console.log('Delete Query Status:', res.status);
    const body = await res.json();
    console.log('Deleted student representation:', body);
  } catch (err) {
    console.error('Delete Query Error:', err);
  }

  console.log('=== STEP 5: VERIFYING CASCASE DELETIONS IN ATTENDANCE RECORDS ===');
  if (sessionId) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance_records?student_id=eq.${studentId}`, {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${token}`
        }
      });
      const body = await res.json();
      console.log('Linked Attendance Records count remaining (should be 0):', body.length);
    } catch (err) {
      console.error('Verify records error:', err);
    }
  }

  console.log('=== STEP 6: VERIFYING CASCADE DELETIONS IN SUMMARY ===');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/attendance_summary?student_id=eq.${studentId}`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    const body = await res.json();
    console.log('Summary records remaining (should be 0):', body.length);
  } catch (err) {
    console.error('Verify summary error:', err);
  }

  console.log('=== VERIFICATION COMPLETED ===');
}

run();
