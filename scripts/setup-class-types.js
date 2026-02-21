require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

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
    }
})

async function checkAndCreateTable() {
    console.log('Checking class_type_settings table...')
    
    // 테이블 존재 여부 확인
    const { data: tables, error: tableError } = await supabase
        .from('class_type_settings')
        .select('*')
        .limit(1)
    
    if (tableError && tableError.code === 'PGRST204') {
        console.log('Table does not exist, creating...')
        
        // SQL 직접 실행
        const { data, error } = await supabase.rpc('exec_sql', {
            sql: `
                CREATE TABLE IF NOT EXISTS public.class_type_settings (
                    type TEXT PRIMARY KEY,
                    label TEXT NOT NULL,
                    credit_cost INTEGER DEFAULT 1 NOT NULL,
                    is_active BOOLEAN DEFAULT true NOT NULL,
                    sort_order INTEGER DEFAULT 0 NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
                );

                ALTER TABLE public.class_type_settings ENABLE ROW LEVEL SECURITY;

                DROP POLICY IF EXISTS "Anyone can view class type settings" ON public.class_type_settings;
                CREATE POLICY "Anyone can view class type settings"
                    ON public.class_type_settings
                    FOR SELECT
                    USING (true);

                DROP POLICY IF EXISTS "Only admins can modify class type settings" ON public.class_type_settings;
                CREATE POLICY "Only admins can modify class type settings"
                    ON public.class_type_settings
                    FOR ALL
                    USING (
                        EXISTS (
                            SELECT 1 FROM public.profiles
                            WHERE id = auth.uid() AND role = 'admin'
                        )
                    );

                INSERT INTO public.class_type_settings (type, label, credit_cost, sort_order) VALUES
                    ('theory', '이론 교육', 0, 1),
                    ('pool', '풀장 교육', 1, 2),
                    ('training', '트레이닝', 2, 3)
                ON CONFLICT (type) DO NOTHING;
            `
        })
        
        if (error) {
            console.error('Error creating table:', error)
        } else {
            console.log('Table created successfully!')
        }
    } else if (tableError) {
        console.error('Error checking table:', tableError)
    } else {
        console.log('Table already exists!')
        console.log('Current settings:', tables)
    }
}

checkAndCreateTable()
