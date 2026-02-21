
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCredits() {
  console.log('Checking credits for user...');
  
  // 1. Get the user (we used the first one in the list, usually header or we can search by email if known)
  // In the browser test, it seemed to be 'hong@test.com' or similar? 
  // The browser test said '홍길동' (111@111.com).
  
  const email = '111@111.com';

  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (userError) {
    console.error('Error finding user:', userError);
    return;
  }

  console.log(`User: ${user.name} (${user.email})`);
  console.log(`Current Credits: ${user.credits}`);

  // 2. Check transactions
  const { data: transactions, error: txError } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (txError) {
    console.error('Error fetching transactions:', txError);
    return;
  }

  console.log('Recent Transactions:');
  transactions.forEach(tx => {
    console.log(`[${tx.created_at}] Type: ${tx.transaction_type}, Amount: ${tx.amount}, Balance: ${tx.balance_before} -> ${tx.balance_after}, Reason: ${tx.reason || 'N/A'}`);
  });
}

checkCredits();
