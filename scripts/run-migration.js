const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// User provided: postgresql://postgres.fzsxkssweptpmrengunf:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
// Fresh Password from user: WHsAYawMptqMIkix
const dbConfig = {
    user: 'postgres.fzsxkssweptpmrengunf', // Correct username for pooler
    host: 'aws-1-ap-south-1.pooler.supabase.com',
    database: 'postgres',
    password: 'WHsAYawMptqMIkix',
    port: 6543,
    ssl: { rejectUnauthorized: false } // Required for Supabase
};

async function runMigration() {
    console.log(`Checking connection info...`);
    console.log(`Host: ${dbConfig.host}`);
    console.log(`User: ${dbConfig.user}`);
    console.log(`Port: ${dbConfig.port}`);
    
    const client = new Client(dbConfig);
    
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('✅ Connected successfully!');

        const migrationPath = path.join(__dirname, '../supabase/migrations/20260211_create_v2_tables.sql');
        console.log(`Reading migration file: ${migrationPath}`);
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Executing migration SQL...');
        // Execute the entire SQL file contents
        await client.query(sql);
        console.log('✅ Migration executed successfully! All tables created.');
    } catch (err) {
        console.error('❌ Error executing migration:', err);
        if (err.code === 'ENOTFOUND') {
            console.error('\n[DIAGNOSTICS] Host not found. This might require the correct Pooler URL if direct access is blocked.');
        } else if (err.code === '28P01') {
            console.error('\n[DIAGNOSTICS] Authentication failed. Please check the password again.');
        }
        process.exit(1);
    } finally {
        await client.end();
        console.log('Connection closed.');
    }
}

runMigration();
