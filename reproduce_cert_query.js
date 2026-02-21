
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCertQuery() {
  console.log('Testing certificate query...')
  
  const { data: rawTopCertificates, error: topCertError } = await supabase
    .from('certificates')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5)

  if (topCertError) {
    console.error('Error fetching certificates:', topCertError)
  } else {
    console.log('Fetched certificates:', rawTopCertificates)
  }
}

testCertQuery()
