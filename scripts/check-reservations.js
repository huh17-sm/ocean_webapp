const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function checkReservations() {
    console.log('--- Checking Reservations ---');
    
    // User ID from the previous tests/logs
    const userId = 'fe68ba64-2544-4871-99a2-243a0c83e57c';
    
    const { data, error } = await supabase
        .from('reservations')
        .select('*, classes(*)')
        .eq('user_id', userId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} reservations for user ${userId}`);
    data.forEach((r, i) => {
        console.log(`[${i}] ID: ${r.id}, Status: ${r.status}, Class ID: ${r.class_id}`);
        if (r.classes) {
            console.log(`    Class Date: ${r.classes.date}, Time: ${r.classes.time}, Type: ${r.classes.type}`);
        } else {
            console.log(`    Class data MISSING for class_id: ${r.class_id}`);
        }
    });

    const today = new Date().toISOString().split('T')[0];
    console.log('Today is:', today);
}

checkReservations();
