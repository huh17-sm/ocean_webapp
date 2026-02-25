require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
async function test() {
    const { data: reservations, error } = await supabase
        .from('reservations')
        .select('id, status, class_id, classes(date, title)')
        .limit(20)
        .order('created_at', { ascending: false })
    
    console.log('recent reservations', error)
    reservations?.forEach(r => {
        console.log(`- ${r.classes?.date} | Status: ${r.status} | Class: ${r.class_id}`)
    })
}
test()
