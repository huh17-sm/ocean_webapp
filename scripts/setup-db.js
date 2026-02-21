const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function run() {
    const connectionString = process.env.DIRECT_DATABASE_URL;
    if (!connectionString) {
        console.error('DIRECT_DATABASE_URL is missing in .env.local');
        process.exit(1);
    }

    const client = new Client({
        connectionString: connectionString.replace(/^"(.*)"$/, '$1'),
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('Connected to PostgreSQL');

        const sqlPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Better splitting: split by semicolon but ignore semicolons inside quotes or Dollar-quoted strings
        // Supabase schema uses $$ blocks for functions.
        // For simplicity, let's just extract the class_requests parts or use a better parser.
        
        // Actually, let's just find the section for class_requests
        const startMarker = '-- Create class_requests table';
        const startIndex = sql.indexOf(startMarker);
        
        if (startIndex === -1) {
            console.error('Could not find class_requests section in schema.sql');
            process.exit(1);
        }

        const classRequestsSql = sql.substring(startIndex);
        
        console.log('Executing class_requests SQL...');
        const statements = classRequestsSql.split(';').map(s => s.trim()).filter(s => s.length > 0);
        
        for (let statement of statements) {
            try {
                await client.query(statement + ';');
                console.log('Ran:', statement.split('\n')[0].substring(0, 50) + '...');
            } catch (err) {
                if (err.message.includes('already exists')) {
                    console.log('Already exists:', statement.split('\n')[0].substring(0, 50) + '...');
                } else {
                    console.error('Error running:', statement.substring(0, 100), err.message);
                }
            }
        }

        console.log('Done!');

    } catch (err) {
        console.error('Fatal error:', err);
    } finally {
        await client.end();
    }
}

run();
