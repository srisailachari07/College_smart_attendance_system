// scratch/find_tenant_region_5432.js
const { Client } = require('pg');

const regions = [
  'ap-south-1',
  'ap-southeast-1',
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-central-1',
  'eu-west-1',
  'eu-west-2',
  'sa-east-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ca-central-1',
  'eu-west-3'
];

async function run() {
  const projectRef = 'gvgaafrfwclmppuqqvac';
  const username = `postgres.${projectRef}`;
  const database = 'postgres';
  const port = 5432; // Try Session port 5432

  console.log(`Locating region for tenant ${projectRef} on port 5432...`);

  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    
    const dns = require('dns');
    const hostExists = await new Promise((resolve) => {
      dns.lookup(host, (err) => {
        if (err) resolve(false);
        else resolve(true);
      });
    });

    if (!hostExists) {
      continue;
    }

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
      const msg = err.message;
      if (msg.includes('authentication failed')) {
        console.log(`\n=== FOUND TENANT REGION: ${region} ===`);
        await client.end();
        return;
      } else {
        console.log(`Region ${region}: ${msg}`);
      }
      try {
        await client.end();
      } catch (e) {}
    }
  }
  console.log('Finished checking regions on port 5432.');
}

run();
