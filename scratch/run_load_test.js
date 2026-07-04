const SUPABASE_URL = 'https://gvgaafrfwclmppuqqvac.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Z2FhZnJmd2NsbXBwdXFxdmFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzODg0MTksImV4cCI6MjA5NDk2NDQxOX0.aXdZDpv_D9ZiEzEK2wCkP6fEbnLLSBbPsg0VbZEM1uk';

// Helper to run a single request and measure latency
async function measureRequest(url, options) {
  const start = Date.now();
  try {
    const res = await fetch(url, options);
    const latency = Date.now() - start;
    return { success: res.ok, status: res.status, latency };
  } catch (err) {
    return { success: false, latency: Date.now() - start, error: err.message };
  }
}

// Run a batch of concurrent requests
async function runConcurrentBatch(url, options, count) {
  const promises = [];
  for (let i = 0; i < count; i++) {
    promises.push(measureRequest(url, options));
  }
  return Promise.all(promises);
}

// Calculate statistics (average, 95th, 99th percentiles)
function calculateStats(results) {
  const latencies = results.map(r => r.latency).sort((a, b) => a - b);
  const total = latencies.length;
  const sum = latencies.reduce((acc, val) => acc + val, 0);
  const avg = sum / total;
  const p95 = latencies[Math.floor(total * 0.95)] || latencies[total - 1];
  const p99 = latencies[Math.floor(total * 0.99)] || latencies[total - 1];
  const max = latencies[total - 1];
  const successes = results.filter(r => r.success).length;
  const successRate = (successes / total) * 100;

  return {
    count: total,
    successes,
    successRate: successRate.toFixed(2) + '%',
    avg: avg.toFixed(2) + 'ms',
    p95: p95 + 'ms',
    p99: p99 + 'ms',
    max: max + 'ms'
  };
}

async function run() {
  console.log('=== STARTING SMARTATTEND SCALABILITY & CONCURRENCY LOAD TEST ===');
  
  // URL and request payload to test student attendance marking RPC
  const url = `${SUPABASE_URL}/rest/v1/rpc/mark_attendance`;
  const options = {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json'
    },
    // We send dummy arguments to hit the database logic quickly
    body: JSON.stringify({
      p_mobile: '8184963725',
      p_code: '0000' // wrong code, will hit table lookups and return false
    })
  };

  const concurrencyLevels = [10, 50, 100, 200];
  
  for (const level of concurrencyLevels) {
    console.log(`\nTesting Concurrency Level: ${level} simultaneous requests...`);
    const results = await runConcurrentBatch(url, options, level);
    const stats = calculateStats(results);
    console.log(`Results for ${level} concurrent requests:`);
    console.table(stats);
  }

  console.log('\n=== LOAD TEST COMPLETED ===');
}

run();
