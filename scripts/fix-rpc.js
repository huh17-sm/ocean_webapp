const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// 수파베이스 DB 접속 정보 (run-migration.js에서 가져옴)
const dbConfig = {
    user: 'postgres', 
    host: 'aws-0-ap-northeast-2.pooler.supabase.com',
    database: 'postgres',
    password: '<REMOVED>',
    port: 6543,
    ssl: { rejectUnauthorized: false } 
};

async function fixRpc() {
    console.log(`--- RPC 함수 수정 시작 ---`);
    console.log(`Host: ${dbConfig.host}`);
    
    const client = new Client(dbConfig);
    
    try {
        console.log('데이터베이스 연결 중...');
        await client.connect();
        console.log('✅ 연결 성공!');

        const fixSqlPath = path.join(__dirname, '../supabase/fix-rpc-functions.sql');
        console.log(`SQL 파일 읽는 중: ${fixSqlPath}`);
        const sql = fs.readFileSync(fixSqlPath, 'utf8');

        console.log('SQL 실행 중 (credits -> general_credits 변경)...');
        await client.query(sql);
        console.log('✅ RPC 함수 수정이 완료되었습니다!');
    } catch (err) {
        console.error('❌ SQL 실행 중 오류 발생:', err);
        process.exit(1);
    } finally {
        await client.end();
        console.log('연결 종료.');
    }
}

fixRpc();
