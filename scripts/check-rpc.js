
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRpc() {
  console.log('Checking add_credits RPC...');
  
  // Try to call add_credits with a dummy call that fails validation or just checks existence?
  // We can't easily check existence without calling it or querying pg_proc (which requires admin)
  // But we have service role key, so we can might querying schema?
  // Let's just try to call it with invalid arguments or a test user.
  
  // We'll use the user we found earlier '111@111.com'
  const email = '111@111.com';
  const { data: user } = await supabase.from('profiles').select('id').eq('email', email).single();
  
  if (!user) {
      console.log('Test user not found, skipping RPC call test.');
      return;
  }

  // Call with 0 amount (if allowed) or 1 and then deduct?
  // Or just see if it errors with "function not found".
  
  try {
      const { data, error } = await supabase.rpc('add_credits', {
          p_user_id: user.id,
          p_amount: 0,
          p_reason: 'test_rpc_check',
          p_memo: 'Checking RPC existence'
      });
      
      if (error) {
          console.error('RPC Error:', error.message);
          if (error.message.includes('function') && error.message.includes('does not exist')) {
              console.log('CONCLUSION: RPC does not exist.');
          } else {
              console.log('CONCLUSION: RPC exists but returned error (which is fine).');
          }
      } else {
          console.log('RPC Call Successful:', data);
          console.log('CONCLUSION: RPC exists.');
      }
  } catch (e) {
      console.error('Exception:', e);
  }
}

checkRpc();
