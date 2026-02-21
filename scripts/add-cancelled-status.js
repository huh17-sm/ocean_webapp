const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addCancelledStatus() {
  console.log('🔧 cancelled 상태 추가 중...\n')

  // 1. 제약조건 제거
  console.log('1️⃣ 기존 제약조건 제거...')
  const { error: dropError } = await supabase.rpc('exec_sql', {
    query: `alter table public.class_requests drop constraint if exists class_requests_status_check;`
  })

  if (dropError) {
    console.log('   ⚠️  RPC 실패, 직접 SQL 실행 필요')
    console.log('\n📝 Supabase Dashboard → SQL Editor에서 실행하세요:\n')
    console.log(`alter table public.class_requests drop constraint if exists class_requests_status_check;`)
    console.log(`\nalter table public.class_requests add constraint class_requests_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled'));`)
    console.log('\n')
  } else {
    console.log('   ✅ 제약조건 제거 완료')
  }

  // 2. 새 제약조건 추가
  console.log('2️⃣ 새 제약조건 추가 (cancelled 포함)...')
  const { error: addError } = await supabase.rpc('exec_sql', {
    query: `alter table public.class_requests add constraint class_requests_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled'));`
  })

  if (addError) {
    console.log('   ⚠️  RPC 실패')
  } else {
    console.log('   ✅ 제약조건 추가 완료')
  }

  // 3. 확인
  console.log('\n3️⃣ 테스트: cancelled 상태로 업데이트 시도...')
  const { data: testRequest } = await supabase
    .from('class_requests')
    .select('id')
    .limit(1)
    .single()

  if (testRequest) {
    const { error: testError } = await supabase
      .from('class_requests')
      .update({ status: 'cancelled' })
      .eq('id', testRequest.id)

    if (testError) {
      console.log('   ❌ 테스트 실패:', testError.message)
      console.log('\n   수동으로 SQL을 실행해야 합니다.')
    } else {
      console.log('   ✅ cancelled 상태 업데이트 성공!')
      
      // 원래대로 복구
      await supabase
        .from('class_requests')
        .update({ status: 'approved' })
        .eq('id', testRequest.id)
    }
  }

  console.log('\n✅ 완료!')
}

addCancelledStatus()
