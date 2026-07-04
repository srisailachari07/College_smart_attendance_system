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

  console.log('=== STEP 1: CLEANING UP ANY EXISTING DUMMY FACULTY ===');
  let existingDummyId;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/faculty?faculty_id=eq.TESTFAC01&select=id`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    const body = await res.json();
    if (body.length > 0) {
      existingDummyId = body[0].id;
      console.log('Found existing dummy faculty:', existingDummyId);
      const delRes = await fetch(`${SUPABASE_URL}/rest/v1/faculty?id=eq.${existingDummyId}`, {
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

  console.log('=== STEP 2: CREATING NEW DUMMY FACULTY (NO DEPENDENCIES) ===');
  let facultyId;
  try {
    // We insert directly into public.faculty table since this is a test.
    // To bypass FK constraints on auth_id, we can leave auth_id as null.
    const res = await fetch(`${SUPABASE_URL}/rest/v1/faculty`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        faculty_name: 'Lifecycle Test Faculty',
        faculty_id: 'TESTFAC01',
        email: 'testfac01@college.edu',
        is_active: true
      })
    });
    const body = await res.json();
    console.log('Creation Status:', res.status);
    if (body.length > 0) {
      facultyId = body[0].id;
      console.log('Created Faculty UUID:', facultyId);
    }
  } catch (err) {
    console.error('Creation Error:', err);
    return;
  }

  if (!facultyId) {
    console.log('Faculty creation failed.');
    return;
  }

  console.log('=== STEP 3: TESTING DEACTIVATION (is_active = false) ===');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/faculty?id=eq.${facultyId}`, {
      method: 'PATCH',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ is_active: false })
    });
    const body = await res.json();
    console.log('Deactivate Status:', res.status);
    console.log('Deactivated row representation (is_active should be false):', body[0]?.is_active);
  } catch (err) {
    console.error('Deactivate error:', err);
  }

  console.log('=== STEP 4: TESTING RESTORATION (is_active = true) ===');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/faculty?id=eq.${facultyId}`, {
      method: 'PATCH',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ is_active: true })
    });
    const body = await res.json();
    console.log('Restore Status:', res.status);
    console.log('Restored row representation (is_active should be true):', body[0]?.is_active);
  } catch (err) {
    console.error('Restore error:', err);
  }

  console.log('=== STEP 5: VERIFYING PERMANENT DELETION (NO DEPENDENCIES) ===');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/faculty?id=eq.${facultyId}`, {
      method: 'DELETE',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('Delete status (should be 204 or 200):', res.status);
  } catch (err) {
    console.error('Delete error:', err);
  }

  console.log('=== FACULTY LIFECYCLE VERIFICATION COMPLETED ===');
}

run();
