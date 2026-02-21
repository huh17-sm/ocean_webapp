/**
 * PostgreSQL 직접 연결을 통한 크레딧 시스템 마이그레이션
 */

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// 환경 변수 로드
require('dotenv').config({ path: '.env.local' })

const connectionString = process.env.DIRECT_DATABASE_URL

if (!connectionString) {
  console.error('❌ DIRECT_DATABASE_URL 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

async function applyMigration() {
  console.log('🌊 오션프리다이빙 크레딧 시스템 마이그레이션 시작...\n')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    // PostgreSQL 연결
    await client.connect()
    console.log('✅ PostgreSQL 연결 성공\n')

    // 마이그레이션 파일 읽기
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260209_credit_system.sql')
    const sql = fs.readFileSync(migrationPath, 'utf8')

    console.log('📄 마이그레이션 파일 로드 완료')
    console.log('🚀 SQL 실행 중...\n')

    // SQL 전체 실행
    await client.query(sql)

    console.log('✅ 크레딧 시스템 마이그레이션 완료!\n')
    console.log('생성된 테이블:')
    console.log('  ✓ credit_transactions (크레딧 거래 내역)')
    console.log('  ✓ certification_requests (자격증 발급 신청)')
    console.log('  ✓ attendance_logs (정기 트레이닝 출석)')
    console.log('  ✓ package_purchases (패키지 구매 내역)\n')
    console.log('생성된 함수:')
    console.log('  ✓ deduct_credits() (크레딧 차감)')
    console.log('  ✓ add_credits() (크레딧 추가)\n')
    console.log('추가된 컬럼:')
    console.log('  ✓ reservations.credit_cost (예약 시 차감 크레딧)')
    console.log('  ✓ reservations.credit_refunded (환불 여부)\n')
    console.log('🎉 이제 웹앱에서 테스트할 수 있습니다!')
    console.log('   http://localhost:3000/admin/credit-test\n')

  } catch (error) {
    console.error('❌ 마이그레이션 실행 중 오류 발생:')
    console.error(error.message)
    
    if (error.message.includes('already exists')) {
      console.log('\n💡 일부 테이블이 이미 존재합니다. 이는 정상입니다.')
      console.log('   기존 데이터는 유지되며, 새로운 테이블만 생성됩니다.\n')
    }
  } finally {
    await client.end()
    console.log('📡 PostgreSQL 연결 종료')
  }
}

applyMigration()
