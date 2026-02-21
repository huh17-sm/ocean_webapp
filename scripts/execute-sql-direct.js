const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function executeSqlDirect() {
  console.log('🔧 SQL 직접 실행 중...\n')

  // Supabase는 직접 SQL 실행을 위한 RPC가 없으므로
  // PostgreSQL 클라이언트를 사용해야 합니다
  
  const { Pool } = require('pg')
  
  // Supabase 연결 정보
  const connectionString = process.env.DATABASE_URL || 
    `postgresql://postgres.fzsxkssweptpmrengunf:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`
  
  console.log('📡 데이터베이스 연결 중...')
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    const client = await pool.connect()
    console.log('✅ 연결 성공!\n')

    // 1. 제약조건 제거
    console.log('1️⃣ 기존 제약조건 제거...')
    await client.query(`
      alter table public.class_requests 
      drop constraint if exists class_requests_status_check
    `)
    console.log('   ✅ 완료\n')

    // 2. 새 제약조건 추가
    console.log('2️⃣ 새 제약조건 추가 (cancelled 포함)...')
    await client.query(`
      alter table public.class_requests
      add constraint class_requests_status_check 
      check (status in ('pending', 'approved', 'rejected', 'cancelled'))
    `)
    console.log('   ✅ 완료\n')

    // 3. 확인
    console.log('3️⃣ 제약조건 확인...')
    const result = await client.query(`
      select conname, pg_get_constraintdef(oid) as definition
      from pg_constraint 
      where conrelid = 'public.class_requests'::regclass 
      and conname = 'class_requests_status_check'
    `)
    
    if (result.rows.length > 0) {
      console.log('   ✅ 제약조건 확인:')
      console.log(`   ${result.rows[0].definition}\n`)
    }

    client.release()
    await pool.end()

    console.log('✅ 모든 작업 완료!')
    console.log('\n이제 관리자가 수업을 삭제하면 자동으로 요청 상태가 cancelled로 변경됩니다! 🎉')

  } catch (error) {
    console.error('❌ 오류:', error.message)
    console.log('\n💡 pg 모듈이 설치되지 않았을 수 있습니다.')
    console.log('   다음 명령어로 설치하세요: npm install pg')
    await pool.end()
  }
}

executeSqlDirect()
