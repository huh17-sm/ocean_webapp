const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  // We can't query information_schema directly with supabase-js easily without raw SQL function.
  // Instead, we'll try to insert a dummy record to see if columns exist or check a select.
  // Actually, let's just use a raw query if a function exists, or just try to select * limit 0.
  
  // Best way with service role is to just try to select and see the error or empty data.
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error querying credit_transactions:', error);
    return;
  }
  
  console.log('Query successful. Data:', data);
  console.log('If data is empty array, table exists.');
  
  // To check columns, we can try to select specific columns we care about
  const { data: colsData, error: colsError } = await supabase
    .from('credit_transactions')
    .select('id, user_id, amount, reason, created_by, created_at')
    .limit(1);
    
  if (colsError) {
      console.error('Column check failed:', colsError);
  } else {
      console.log('Columns [id, user_id, amount, reason, created_by, created_at] seem to exist.');
  }
}

checkSchema();
