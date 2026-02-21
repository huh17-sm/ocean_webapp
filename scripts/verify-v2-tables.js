const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fzsxkssweptpmrengunf.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6c3hrc3N3ZXB0cG1yZW5ndW5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwOTE3NTQsImV4cCI6MjA4NTY2Nzc1NH0.-SippbmcSdNx1WHsRn1kC446pglNaM2Ebe624Q63dF0';

const supabase = createClient(supabaseUrl, anonKey);

async function verifyTables() {
    console.log('Verifying table creation with ANON key...');
    
    const tables = ['profiles', 'debriefings', 'course_progress', 'skill_completions', 'certificates'];
    const results = {};

    for (const table of tables) {
        const { error } = await supabase
            .from(table)
            .select('*')
            .limit(0);

        if (error) {
            results[table] = `❌ Error: ${error.message} (Code: ${error.code})`;
        } else {
            results[table] = '✅ Exists';
        }
    }

    console.log('\n--- Verification Results ---');
    Object.entries(results).forEach(([table, status]) => {
        console.log(`${table.padEnd(20)}: ${status}`);
    });
}

verifyTables();
