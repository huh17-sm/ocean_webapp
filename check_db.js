const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim(); // Handle values with =
    env[key] = value;
  }
});

const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const url = env['NEXT_PUBLIC_SUPABASE_URL'];

console.log('URL:', url);
console.log('Service Key (first 10 chars):', serviceKey ? serviceKey.substring(0, 10) : 'MISSING');

if (!serviceKey || !serviceKey.includes('.')) {
    console.log('WARNING: Service Role Key does not look like a JWT (no dots). It might be invalid or a different format.');
}

const supabase = createClient(url, serviceKey);

async function check() {
  console.log('Fetching profiles...');
  const { data, error } = await supabase.from('profiles').select('id, email, role, name').order('created_at', { ascending: false }).limit(10);
  
  if (error) {
    console.error('Error fetching profiles:', error);
  } else {
    console.log('Profiles:', JSON.stringify(data, null, 2));
    
    const admins = data.filter(p => p.role === 'admin');
    console.log(`Found ${admins.length} admins out of ${data.length} profiles.`);
  }
}

check();
