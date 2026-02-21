const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DIRECT_DATABASE_URL;

if (!connectionString) {
  console.error('Error: DIRECT_DATABASE_URL is not defined in .env.local');
  process.exit(1);
}

const sqlFilePath = process.argv[2];

if (!sqlFilePath) {
  console.error('Usage: node scripts/run-sql.js <path-to-sql-file>');
  process.exit(1);
}

const fullPath = path.resolve(sqlFilePath);

if (!fs.existsSync(fullPath)) {
  console.error(`Error: File not found at ${fullPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(fullPath, 'utf8');

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function run() {
  try {
    await client.connect();
    console.log(`Connected to database. Executing ${path.basename(fullPath)}...`);
    
    await client.query(sql);
    
    console.log('✅ SQL executed successfully.');
  } catch (err) {
    console.error('❌ Database error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
