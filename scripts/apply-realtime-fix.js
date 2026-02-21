const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function applyFix() {
    const connectionString = process.env.DIRECT_DATABASE_URL;
    if (!connectionString) {
        console.error('DIRECT_DATABASE_URL not found in .env.local');
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString.replace(/"/g, ''),
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const sql = `
            -- 1. profiles 테이블에 리얼타임 기능 활성화
            ALTER TABLE public.profiles REPLICA IDENTITY FULL;

            -- 2. supabase_realtime 발행물(publication)에 profiles 테이블 추가
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_publication_tables 
                    WHERE pubname = 'supabase_realtime' 
                    AND schemaname = 'public' 
                    AND tablename = 'profiles'
                ) THEN
                    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
                END IF;
            END $$;
        `;

        await client.query(sql);
        console.log('Successfully applied realtime settings to profiles table.');
    } catch (err) {
        console.error('Error applying fix:', err);
    } finally {
        await client.end();
    }
}

applyFix();
