// scratch/try_postgres_user.js
const { Client } = require('pg');

async function run() {
  const host = 'aws-0-ap-northeast-2.pooler.supabase.com';
  const port = 6543;
  const username = 'postgres';
  const database = 'postgres';

  console.log(`Connecting with username ${username}...`);
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
    console.log('Error:', err.message);
  } finally {
    try {
      await client.end();
    } catch (e) {}
  }
}
run();
