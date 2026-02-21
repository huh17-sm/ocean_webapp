
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkPolicies() {
  console.log('Checking RLS policies for certificates table...')
  
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'certificates')

  if (error) {
    // pg_policies might not be directly queryable via PostgREST if not exposed.
    // Try raw query if possible using rpc, but likely not available.
    console.error('Error fetching policies via standard query (expected if not exposed):', error)
  } else {
    console.log('Policies:', data)
  }
  
  // Alternative: Try to select as anon user
  const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  const { data: anonData, error: anonError } = await anonClient
    .from('certificates')
    .select('*')
    .limit(1)
    
  console.log('Anon select result:', { data: anonData, error: anonError })
}

checkPolicies()
