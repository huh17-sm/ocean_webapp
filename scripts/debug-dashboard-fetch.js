const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function debugDashboardFetch() {
    console.log('--- Debugging Dashboard Fetch ---');
    const userId = 'fe68ba64-2544-4871-99a2-243a0c83e57c';
    const today = new Date().toISOString().split('T')[0];
    
    console.log('Parameters:', { userId, today });

    // Try multiple variations of the query
    
    // 1. Original query
    const { data: q1, error: e1 } = await supabase
        .from('reservations')
        .select('*, classes(*)')
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .gte('classes.date', today);
    
    console.log('Original Query Count:', q1?.length || 0, 'Error:', e1);
    if (q1 && q1.length > 0) {
        q1.forEach(r => console.log(` - ID: ${r.id}, Class Date: ${r.classes?.date}`));
    }

    // 2. Query with !inner (to ensure parent rows are filtered by join)
    const { data: q2, error: e2 } = await supabase
        .from('reservations')
        .select('*, classes!inner(*)')
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .gte('classes.date', today);
    
    console.log('Query with !inner Count:', q2?.length || 0, 'Error:', e2);

    // 3. Query without date filter
    const { data: q3, error: e3 } = await supabase
        .from('reservations')
        .select('*, classes(*)')
        .eq('user_id', userId)
        .eq('status', 'confirmed');
    
    console.log('Query without date filter Count:', q3?.length || 0);

    // 4. Check if there are any reservations at all for this user
    const { data: q4 } = await supabase.from('reservations').select('*').eq('user_id', userId);
    console.log('Total user reservations:', q4?.length || 0);
}

debugDashboardFetch();
