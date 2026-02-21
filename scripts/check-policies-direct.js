const { Client } = require('pg');

const dbConfig = {
    user: 'postgres.fzsxkssweptpmrengunf', 
    host: 'aws-0-ap-northeast-2.pooler.supabase.com',
    database: 'postgres',
    password: '<REMOVED>', 
    port: 6543,
    ssl: { rejectUnauthorized: false }
};

async function listPolicies() {
    console.log('Connecting to DB...', dbConfig.host);
    const client = new Client(dbConfig);
    
    try {
        await client.connect();
        console.log('Connected!');
        
        console.log('\n--- Policies for RESERVATIONS ---');
        const resRes = await client.query(`
            SELECT policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'reservations'
        `);
        console.table(resRes.rows);

        console.log('\n--- Policies for CLASSES ---');
        const classRes = await client.query(`
            SELECT policyname, roles, cmd, qual, with_check 
            FROM pg_policies 
            WHERE tablename = 'classes'
        `);
        console.table(classRes.rows);
        
    } catch (err) {
        console.error('Database Error:', err);
    } finally {
        await client.end();
    }
}

listPolicies();
