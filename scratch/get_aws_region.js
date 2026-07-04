// scratch/get_aws_region.js
const ipaddr = require('ipaddr.js'); // Ensure we can check cidr membership

async function run() {
  try {
    const targetIp = '2406:da12:5ca:b700:9a64:2cb6:7f39:43b7';
    console.log(`Checking AWS region for IPv6: ${targetIp}...`);

    const res = await fetch('https://ip-ranges.amazonaws.com/ip-ranges.json');
    const data = await res.json();

    const parsedTarget = ipaddr.parse(targetIp);

    for (const prefix of data.ipv6_prefixes) {
      try {
        const parsedPrefix = ipaddr.parseCIDR(prefix.ipv6_prefix);
        if (parsedTarget.match(parsedPrefix)) {
          console.log(`\n=== MATCH FOUND ===`);
          console.log(`Prefix: ${prefix.ipv6_prefix}`);
          console.log(`Region: ${prefix.region}`);
          console.log(`Service: ${prefix.service}`);
          return;
        }
      } catch (e) {
        // Ignore parsing errors for individual prefixes
      }
    }
    console.log('No matching AWS prefix found in the published JSON list.');
  } catch (err) {
    console.error('Error fetching or checking AWS ranges:', err);
  }
}
run();
