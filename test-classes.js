require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
async function test() {
    const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3)
    console.log(classes?.length, 'classes found', error)
    if(classes?.length > 0) console.log('recent classes:', classes.map(c => ({ id: c.id, date: c.date, type: c.type, created_at: c.created_at })))
}
test()
