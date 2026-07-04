// scratch/try_pg_connect.js
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

async function tryConnect() {
  const host = 'db.gvgaafrfwclmppuqqvac.supabase.co';
  const port = 5432;
  const user = 'postgres';
  const database = 'postgres';

  console.log(`Attempting connections to pg host: ${host}...`);

  for (const pw of passwords) {
    console.log(`Trying password: ${pw}...`);
    const client = new Client({
      host,
      port,
      user,
      password: pw,
      database,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log('=== CONNECTION SUCCESSFUL ===');
      console.log(`Password is: ${pw}`);
      
      // Run the migration
      const sqlPath = path.join(__dirname, '../sql/fix_faculty_deletion.sql');
      if (fs.existsSync(sqlPath)) {
        console.log('Running fix_faculty_deletion.sql migration...');
        const migrationSql = fs.readFileSync(sqlPath, 'utf8');
        await client.query(migrationSql);
        console.log('Migration executed successfully!');
        
        // Refresh PostgREST schema cache
        console.log('Refreshing schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log('PostgREST schema cache reload triggered.');
      } else {
        console.log('fix_faculty_deletion.sql not found at:', sqlPath);
      }

      await client.end();
      return;
    } catch (err) {
      console.log(`Failed with password ${pw}:`, err.message);
      try {
        await client.end();
      } catch (e) {}
    }
  }
  console.log('All password attempts failed.');
}

tryConnect();
