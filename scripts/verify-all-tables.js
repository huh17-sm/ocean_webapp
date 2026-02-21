const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, anonKey);

const tables = [
    'profiles',
    'classes',
    'reservations',
    'class_requests',
    'credit_transactions',
    'package_purchases',
    'debriefings',
    'course_progress',
    'skill_completions',
    'certificates'
];

async function verifyTables() {
    console.log('Verifying all tables...');
    
    for (const table of tables) {
        const { error } = await supabase.from(table).select('*').limit(0);
        if (error) {
            console.log(`${table.padEnd(20)}: ❌ Error (${error.message})`);
        } else {
            console.log(`${table.padEnd(20)}: ✅ Exists`);
        }
    }
}

verifyTables();
