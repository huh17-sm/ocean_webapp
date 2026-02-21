
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function test() {
  console.log('Testing getPendingCertificates...')
  
  const { data, error } = await supabaseAdmin
    .from('certificates')
    .select(
      `
      *,
      user:profiles!user_id(id, name, email)
    `
    )
    .eq('status', 'pending')
    
  if (error) {
    console.error('Error:', JSON.stringify(error, null, 2))
  } else {
    console.log('Data:', data)
  }

  console.log('Testing WITH explicit FK name (!certificates_user_id_fkey)...')
  const { data: data3, error: error3 } = await supabaseAdmin
    .from('certificates')
    .select(
      `
      *,
      user:profiles!certificates_user_id_fkey(id, name, email)
    `
    )
    .eq('status', 'pending')

  if (error3) {
    console.error('Error 3 (With FK name):', JSON.stringify(error3, null, 2))
  } else {
    console.log('Data 3 (With FK name):', data3)
  }

  console.log('Testing without explicit FK...')
   const { data: data2, error: error2 } = await supabaseAdmin
    .from('certificates')
    .select(
      `
      *,
      user:profiles(id, name, email)
    `
    )
    .eq('status', 'pending')

  if (error2) {
      console.error('Error 2:', JSON.stringify(error2, null, 2))
  } else {
      console.log('Data 2:', data2)
  }
}

test()
