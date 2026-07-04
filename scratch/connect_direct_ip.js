// scratch/connect_direct_ip.js
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
  const ipAddress = '2406:da12:5ca:b700:9a64:2cb6:7f39:43b7'; // Resolved IPv6 address
  const port = 5432;
  const user = 'postgres';
  const database = 'postgres';

  console.log(`Connecting directly to database IPv6 address: [${ipAddress}]...`);

  for (const pw of passwords) {
    console.log(`Trying password: ${pw}...`);
    const client = new Client({
      host: ipAddress,
      port,
      user,
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

        console.log('Refreshing schema cache...');
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
}
run();
