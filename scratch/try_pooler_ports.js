// scratch/try_pooler_ports.js
const { Client } = require('pg');

async function test(port) {
  const host = 'aws-0-ap-northeast-2.pooler.supabase.com';
  const username = 'postgres.gvgaafrfwclmppuqqvac';
  const database = 'postgres';
  
  console.log(`Testing port ${port} on ${host}...`);
  const client = new Client({
    host,
    port,
    user: username,
    password: 'wrong-password',
    database,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
  } catch (err) {
    console.log(`Port ${port} error:`, err.message);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}

async function run() {
  await test(5432);
  await test(6543);
}
run();
