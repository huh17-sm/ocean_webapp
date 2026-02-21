const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testConnection() {
    console.log('--- Supabase Connection Test ---');
    console.log('URL:', supabaseUrl);

    // 1. Test Anon Key
    console.log('\n1. Testing ANON_KEY...');
    const supabaseAnon = createClient(supabaseUrl, anonKey);
    const { data: anonData, error: anonError } = await supabaseAnon.from('profiles').select('id').limit(1);
    
    if (anonError) {
        console.log('ANON_KEY: ❌ Failed');
        console.log('Error Message:', anonError.message);
        console.log('Hint:', anonError.hint);
    } else {
        console.log('ANON_KEY: ✅ Success (Access to public profiles)');
    }

    // 2. Test Service Role Key
    console.log('\n2. Testing SERVICE_ROLE_KEY...');
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const { data: adminData, error: adminError } = await supabaseAdmin.from('profiles').select('id, name, role').limit(1);
    
    if (adminError) {
        console.log('SERVICE_ROLE_KEY: ❌ Failed');
        console.log('Error Message:', adminError.message);
        console.log('Hint:', adminError.hint);
    } else {
        console.log('SERVICE_ROLE_KEY: ✅ Success');
        if (adminData && adminData.length > 0) {
            console.log('Sample Data Profile Name:', adminData[0].name);
            console.log('Sample Data Role:', adminData[0].role);
        }
    }
}

testConnection();
