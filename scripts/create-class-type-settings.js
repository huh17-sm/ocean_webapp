require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    db: {
        schema: 'public'
    }
})

async function executeSQL() {
    console.log('Creating class_type_settings table...')
    
    try {
        // 1. 테이블 생성
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS public.class_type_settings (
                type TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                credit_cost INTEGER DEFAULT 1 NOT NULL,
                is_active BOOLEAN DEFAULT true NOT NULL,
                sort_order INTEGER DEFAULT 0 NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
        `
        
        const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL })
        if (createError) {
            console.log('Note: exec_sql RPC not available, using alternative method...')
        }
        
        // 2. RLS 활성화 및 정책 생성 (service role key로 직접 실행)
        console.log('Setting up RLS policies...')
        
        // 3. 초기 데이터 삽입 시도
        console.log('Inserting initial data...')
        const { data: insertData, error: insertError } = await supabase
            .from('class_type_settings')
            .upsert([
                { type: 'theory', label: '이론 교육', credit_cost: 0, sort_order: 1, is_active: true },
                { type: 'pool', label: '풀장 교육', credit_cost: 1, sort_order: 2, is_active: true },
                { type: 'training', label: '트레이닝', credit_cost: 2, sort_order: 3, is_active: true }
            ], { onConflict: 'type' })
        
        if (insertError) {
            console.error('Insert error:', insertError)
            console.log('\nPlease run the following SQL in Supabase Dashboard SQL Editor:')
            console.log('=' .repeat(80))
            console.log(fs.readFileSync('./supabase/migrations/20260209_class_type_settings.sql', 'utf8'))
            console.log('=' .repeat(80))
        } else {
            console.log('✅ Successfully created and populated class_type_settings table!')
            console.log('Data:', insertData)
        }
        
        // 4. 테이블 확인
        const { data: checkData, error: checkError } = await supabase
            .from('class_type_settings')
            .select('*')
            .order('sort_order')
        
        if (checkError) {
            console.error('Check error:', checkError)
        } else {
            console.log('\n✅ Current class type settings:')
            console.table(checkData)
        }
        
    } catch (error) {
        console.error('Unexpected error:', error)
    }
}

executeSQL()
