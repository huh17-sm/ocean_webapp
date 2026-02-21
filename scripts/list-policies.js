const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

// We need the direct DB connection for this
const dbConfig = {
    user: 'postgres',
    host: 'aws-0-ap-northeast-2.pooler.supabase.com',
    database: 'postgres',
    password: '<REMOVED>', 
    port: 6543,
    ssl: { rejectUnauthorized: false }
};

async function listPolicies() {
    const client = new Client(dbConfig);
    await client.connect();
    
    console.log('--- RLS Policies for reservations ---');
    const resRes = await client.query(`
        SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'reservations'
    `);
    console.table(resRes.rows);

    console.log('\n--- RLS Policies for classes ---');
    const classRes = await client.query(`
        SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'classes'
    `);
    console.table(classRes.rows);

    await client.end();
}

listPolicies();
