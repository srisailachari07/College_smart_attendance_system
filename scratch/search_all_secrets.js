// scratch/search_all_secrets.js
const fs = require('fs');
const path = require('path');

const excludeDirs = new Set(['node_modules', '.git', '.agents', 'stitch_college_smart_attendance_system', 'Academic_Scheduler-main']);

function search(dir) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!excludeDirs.has(file)) {
        search(fullPath);
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.js', '.json', '.env', '.txt', '.yml', '.yaml', '.toml', '.md'].includes(ext)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (
          content.includes('service_role') ||
          content.includes('SERVICE_ROLE') ||
          content.includes('supabase.co') ||
          content.includes('postgres') ||
          content.includes('db_pass')
        ) {
          console.log(`Match in: ${fullPath}`);
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            if (line.includes('service_role') || line.includes('SERVICE_ROLE') || line.includes('supabase.co') || line.includes('postgres') || line.includes('db_pass')) {
              console.log(`  L${idx + 1}: ${line.trim()}`);
            }
          });
        }
      }
    }
  }
}

console.log('Searching all files in workspace root and parent folder for database credentials...');
search('c:\\Users\\srisa\\OneDrive\\Desktop\\stitch_college_smart_attendance_system');
console.log('Done.');
