// scratch/try_pooler_connect.js
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const passwords = [
  'Sai@123',
  'admin123',
  'tpvrwoscyifaoefm',
  'postgres',
  'srisailachari07'
];

// Common regions to search
const regions = [
  'ap-south-1', // Mumbai
  'ap-southeast-1', // Singapore
  'us-east-1', // N. Virginia
  'us-east-2', // Ohio
  'us-west-1', // N. California
  'us-west-2', // Oregon
  'eu-central-1', // Frankfurt
  'eu-west-1', // Ireland
  'eu-west-2', // London
  'sa-east-1' // Sao Paulo
];

async function run() {
  const projectRef = 'gvgaafrfwclmppuqqvac';
  const username = `postgres.${projectRef}`;
  const database = 'postgres';
  const port = 6543; // Standard pooler port for Supavisor (can also be 5432)

  console.log(`Searching pooler database hosts for project: ${projectRef}...`);

  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    console.log(`Checking region: ${region} (${host})...`);

    // Let's resolve DNS first to see if the host exists and is reachable
    const dns = require('dns');
    const hostExists = await new Promise((resolve) => {
      dns.resolve(host, (err) => {
        if (err) resolve(false);
        else resolve(true);
      });
    });

    if (!hostExists) {
      console.log(`  DNS: Host does not exist.`);
      continue;
    }

    console.log(`  DNS: Host resolved. Testing passwords...`);

    for (const pw of passwords) {
      const client = new Client({
        host,
        port,
        user: username,
        password: pw,
        database,
        ssl: { rejectUnauthorized: false }
      });

      try {
        await client.connect();
        console.log(`\n=== CONNECTION SUCCESSFUL ===`);
        console.log(`Host: ${host}`);
        console.log(`Username: ${username}`);
        console.log(`Password: ${pw}`);

        // Run migrations
        const sqlPath = path.join(__dirname, '../sql/fix_faculty_deletion.sql');
        if (fs.existsSync(sqlPath)) {
          console.log('Running fix_faculty_deletion.sql migration...');
          const migrationSql = fs.readFileSync(sqlPath, 'utf8');
          await client.query(migrationSql);
          console.log('Migration executed successfully!');

          // Refresh schema cache
          console.log('Refreshing PostgREST schema cache...');
          await client.query("NOTIFY pgrst, 'reload schema';");
          console.log('PostgREST schema cache reload triggered successfully.');
        } else {
          console.log('fix_faculty_deletion.sql not found at:', sqlPath);
        }

        await client.end();
        return;
      } catch (err) {
        console.log(`  Password "${pw}" failed:`, err.message);
        try {
          await client.end();
        } catch (e) {}
      }
    }
  }

  console.log('\nAll connection attempts failed. Region not found or password incorrect.');
}

run();
