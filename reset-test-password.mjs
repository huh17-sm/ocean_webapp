import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function updatePassword() {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('Error listing users:', listError)
    return
  }
  
  const user = users.users.find(u => u.email === 'test1@ocean.com')
  if (!user) {
    console.log('User test1@ocean.com not found')
    return
  }
  
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id, 
    { password: 'Ocean1234!!' }
  )
  
  if (error) {
    console.error('Error updating password:', error)
  } else {
    console.log('Password updated successfully for test1@ocean.com to password123!')
  }
}

updatePassword()
