// scratch/find_tenant_region.js
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
  'ap-southeast-2', // Sydney
  'ap-northeast-1', // Tokyo
  'ap-northeast-2', // Seoul
  'ca-central-1', // Canada
  'eu-west-3' // Paris
];

async function run() {
  const projectRef = 'gvgaafrfwclmppuqqvac';
  const username = `postgres.${projectRef}`;
  const database = 'postgres';
  const port = 6543;

  console.log(`Locating region for tenant ${projectRef}...`);

  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    
    // We check if CNAME resolves
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
      password: 'wrong-password-on-purpose',
      database,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log(`Connected to region: ${region}! (Should not happen with wrong password)`);
      await client.end();
      return;
    } catch (err) {
      const msg = err.message;
      if (msg.includes('authentication failed')) {
        console.log(`\n=== FOUND TENANT REGION: ${region} ===`);
        console.log(`Reason: Host verified user credential check.`);
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
  console.log('Finished checking regions.');
}

run();
