// scratch/try_sni_pooler.js
const { Client } = require('pg');

async function run() {
  const host = 'aws-0-ap-northeast-2.pooler.supabase.com';
  const port = 6543;
  const username = 'postgres'; // Just postgres
  const database = 'postgres';

  console.log(`Connecting with SNI servername...`);
  const client = new Client({
    host,
    port,
    user: username,
    password: 'wrong-password',
    database,
    ssl: {
      rejectUnauthorized: false,
      servername: 'db.gvgaafrfwclmppuqqvac.supabase.co'
    }
  });

  try {
    await client.connect();
  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}
run();
