import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase.from('profiles').select('*').eq('email', 'test1@ocean.com').single()
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('test1@ocean.com profile:', {
      id: data.id,
      email: data.email,
      credits: data.credits,
      general_credits: data.general_credits
    })
  }

  const { data: tx, error: txError } = await supabase.from('credit_transactions').select('*').eq('user_id', data.id).order('created_at', { ascending: false }).limit(3)
  console.log('Recent transactions:', tx)
}

check()
