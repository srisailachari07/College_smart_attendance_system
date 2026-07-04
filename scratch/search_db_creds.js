const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.agents') {
        searchDir(fullPath);
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.env') || file.endsWith('.json') || file.endsWith('.html') || file.endsWith('.txt')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('postgres:') || content.includes('postgresql://') || content.includes('service_role') || content.includes('SERVICE_ROLE') || content.includes('SUPABASE_DB') || content.includes('db_connection') || content.includes('DATABASE_URL')) {
          console.log(`Found match in: ${fullPath}`);
          // Print matching lines
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('postgres:') || line.includes('postgresql://') || line.includes('service_role') || line.includes('SERVICE_ROLE') || line.includes('SUPABASE_DB') || line.includes('db_connection') || line.includes('DATABASE_URL')) {
              console.log(`  L${idx + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }
}

searchDir('.');
