// scratch/try_supabase_link.js
const { execSync } = require('child_process');
const fs = require('fs');

const passwords = [
  'Sai@123',
  'admin123',
  'tpvrwoscyifaoefm',
  'postgres',
  'srisailachari07'
];

async function run() {
  const projectRef = 'gvgaafrfwclmppuqqvac';
  console.log(`Initializing local supabase...`);
  try {
    execSync('npx supabase init', { stdio: 'inherit' });
  } catch (err) {
    console.log('supabase init warning:', err.message);
  }

  for (const pw of passwords) {
    console.log(`\nAttempting link with password: ${pw}...`);
    try {
      // Run supabase link
      execSync(`npx supabase link --project-ref ${projectRef} --password "${pw}"`, { stdio: 'inherit' });
      console.log(`\n=== LINK SUCCESSFUL WITH PASSWORD: ${pw} ===`);
      
      // Let's test a query via the CLI
      console.log('Testing connection query...');
      execSync('npx supabase db query "SELECT 1" --linked', { stdio: 'inherit' });
      console.log('Query successful!');
      return;
    } catch (err) {
      console.log(`Failed with password ${pw}:`, err.message);
    }
  }
  console.log('\nAll link attempts failed.');
}

run();
