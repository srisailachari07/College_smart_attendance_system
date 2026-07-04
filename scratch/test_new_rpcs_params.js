// scratch/test_new_rpcs_params.js
const SUPABASE_URL = 'https://gvgaafrfwclmppuqqvac.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Z2FhZnJmd2NsbXBwdXFxdmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODg0MTksImV4cCI6MjA5NDk2NDQxOX0.aXdZDpv_D9ZiEzEK2wCkP6fEbnLLSBbPsg0VbZEM1uk';

async function testRpc(name, payload) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const body = await res.json();
    console.log(`RPC "${name}": status ${res.status}, body:`, body);
  } catch (err) {
    console.log(`RPC "${name}" error:`, err.message);
  }
}

async function run() {
  console.log('=== TESTING NEW RPCS WITH PARAMETERS ===');
  
  // 1. delete_faculty_permanently (UUID)
  await testRpc('delete_faculty_permanently', { p_faculty_id: 'ef0c9500-512a-48b3-a14f-0c80a5890d4f' });
  
  // 2. delete_multiple_faculty (UUID[])
  await testRpc('delete_multiple_faculty', { p_faculty_ids: ['ef0c9500-512a-48b3-a14f-0c80a5890d4f'] });

  // 3. non_existent_rpc (verify difference)
  await testRpc('non_existent_rpc_name_xyz', { p_param: 1 });
}
run();
