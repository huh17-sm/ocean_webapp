const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

async function listPoliciesApi() {
    console.log('--- Checking Policies via pg_policies view through Supabase ---');

    const { data, error } = await supabase
        .from('pg_policies')
        .select('*');

    if (error) {
        // Unfortunately, default REST API doesn't expose pg_policies usually.
        // Let's try to infer if we can see the reservations table rows at least.
        console.log('Could not query pg_policies directly (expected):', error.message);
        
        console.log('\n--- Trying to fetch Reservations for user as Service Role ---');
        const userId = 'fe68ba64-2544-4871-99a2-243a0c83e57c';
        
        // This should always work with service role
        const { data: q1, error: e1 } = await supabase
            .from('reservations')
            .select('*, classes(*)')
            .eq('user_id', userId);
        
        console.log('Service Role Fetch Count:', q1?.length);
        if(e1) console.error('Service Role Fetch Error:', e1);
        
        // Now, let's try to simulate what an authenticated user sees.
        // We can't easily simulate "auth.uid()" via simple client calls without signing in.
        // But we can check if there is a policy that might be blocking the view.
        
        console.log('\nSince we clearly saw reservations exist for this user in previous steps,');
        console.log('and "No rows returned" happens in the app dashboard,');
        console.log('it is almost certainly an RLS policy issue on the "classes" join.');
        
        // Let's check classes table visibility
        const { data: c1, error: ce1 } = await supabase.from('classes').select('id').limit(1);
        console.log('Service Role Classes Check:', c1 ? 'OK' : 'Failed', ce1 || '');
        
    } else {
        console.table(data);
    }
}

listPoliciesApi();
