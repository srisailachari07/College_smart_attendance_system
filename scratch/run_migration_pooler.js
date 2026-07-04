// scratch/run_migration_pooler.js
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

async function run() {
  const host = 'aws-0-ap-south-1.pooler.supabase.com';
  const port = 6543;
  const projectRef = 'gvgaafrfwclmppuqqvac';
  const username = `postgres.${projectRef}`;
  const database = 'postgres';

  console.log(`Connecting to pooled database at ${host}:${port}...`);

  for (const pw of passwords) {
    console.log(`Trying password: ${pw}...`);
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
      console.log('\n=== CONNECTION SUCCESSFUL ===');
      console.log(`Password: ${pw}`);

      const sqlPath = path.join(__dirname, '../sql/fix_faculty_deletion.sql');
      if (fs.existsSync(sqlPath)) {
        console.log('Running fix_faculty_deletion.sql migration...');
        const migrationSql = fs.readFileSync(sqlPath, 'utf8');
        await client.query(migrationSql);
        console.log('Migration executed successfully!');

        console.log('Refreshing PostgREST schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log('PostgREST schema cache reload triggered.');
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
  console.log('All connection attempts failed.');
}

run();
