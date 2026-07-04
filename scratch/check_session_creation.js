// scratch/check_session_creation.js
const SUPABASE_URL = 'https://gvgaafrfwclmppuqqvac.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Z2FhZnJmd2NsbXBwdXFxdmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODg0MTksImV4cCI6MjA5NDk2NDQxOX0.aXdZDpv_D9ZiEzEK2wCkP6fEbnLLSBbPsg0VbZEM1uk';

// We import node-fetch to simulate the browser fetch
async function run() {
  try {
    // 1. Get Settings
    const settingsRes = await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
    });
    const settings = await settingsRes.json();
    const windowSetting = settings.find(s => s.key === 'attendance_window')?.value;
    const windowSeconds = parseInt(windowSetting || '300', 10) || 300;
    console.log('attendance_window setting value:', windowSetting);
    console.log('Parsed windowSeconds:', windowSeconds);

    // 2. Fetch all faculty members
    const facultyRes = await fetch(`${SUPABASE_URL}/rest/v1/faculty`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
    });
    const faculty = await facultyRes.json();
    console.log('Faculty list in database:');
    console.log(JSON.stringify(faculty, null, 2));
    if (faculty.length === 0) {
      console.log('No faculty found.');
      return;
    }
    const realFacultyId = faculty[1].id;
    console.log('Real Faculty ID:', realFacultyId);

    // Delete existing active sessions for LH-01 first to prevent duplicate active sessions
    const deleteRes = await fetch(`${SUPABASE_URL}/rest/v1/attendance_sessions?lecture_hall=eq.LH-01&status=eq.active`, {
      method: 'DELETE',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'representation'
      }
    });
    console.log('Cleared active sessions status:', deleteRes.status);

    // Call create_attendance_session RPC
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_attendance_session`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_hall: 'LH-01',
        p_session: 'S5',
        p_faculty_uuid: realFacultyId,
        p_window_seconds: windowSeconds
      })
    });
    const rpcData = await rpcRes.json();
    console.log('RPC Response:', rpcData);
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
