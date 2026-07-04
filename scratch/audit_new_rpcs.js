// scratch/audit_new_rpcs.js
const SUPABASE_URL = 'https://gvgaafrfwclmppuqqvac.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Z2FhZnJmd2NsbXBwdXFxdmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODg0MTksImV4cCI6MjA5NDk2NDQxOX0.aXdZDpv_D9ZiEzEK2wCkP6fEbnLLSBbPsg0VbZEM1uk';

const newRpcs = [
  'delete_faculty_permanently',
  'delete_multiple_faculty',
  'bulk_import_students',
  'reset_all_faculty',
  'reset_all_students',
  'override_student_attendance',
  'reset_student_device'
];

async function run() {
  console.log('=== AUDITING NEW RPC AVAILABILITY ===');
  for (const name of newRpcs) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const body = await res.json();
      console.log(`RPC "${name}": status ${res.status}, code: ${body.code}, msg: ${body.message}`);
    } catch (err) {
      console.log(`RPC "${name}" error:`, err.message);
    }
  }
}
run();
