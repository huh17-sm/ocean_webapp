const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyCancelledStatusDirect() {
  console.log('🔧 cancelled 상태 추가 중...\n')

  try {
    // PostgreSQL에서는 여러 문장을 한 번에 실행할 수 없으므로 분리
    
    // 1. 제약조건 제거
    console.log('1️⃣ 기존 제약조건 제거 시도...')
    const dropSql = `alter table public.class_requests drop constraint if exists class_requests_status_check`
    
    const dropResult = await supabase.rpc('exec', { sql: dropSql }).catch(() => null)
    
    // 2. 새 제약조건 추가
    console.log('2️⃣ 새 제약조건 추가 시도...')
    const addSql = `alter table public.class_requests add constraint class_requests_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled'))`
    
    const addResult = await supabase.rpc('exec', { sql: addSql }).catch(() => null)
    
    console.log('\n⚠️  RPC 방식이 작동하지 않을 수 있습니다.')
    console.log('\n📝 다음 방법 중 하나를 선택하세요:\n')
    
    console.log('방법 1: Supabase Dashboard 사용')
    console.log('  1. https://supabase.com/dashboard 접속')
    console.log('  2. SQL Editor 메뉴 선택')
    console.log('  3. 아래 SQL 복사 & 실행:\n')
    console.log('  alter table public.class_requests drop constraint if exists class_requests_status_check;')
    console.log('  alter table public.class_requests add constraint class_requests_status_check check (status in (\'pending\', \'approved\', \'rejected\', \'cancelled\'));\n')
    
    console.log('방법 2: 직접 테스트')
    console.log('  아래 명령어로 cancelled 상태 업데이트를 시도해봅니다:\n')
    
    // 3. 테스트
    const { data: requests } = await supabase
      .from('class_requests')
      .select('id, status')
      .limit(1)

    if (requests && requests.length > 0) {
      const testId = requests[0].id
      const originalStatus = requests[0].status
      
      console.log(`  테스트 요청 ID: ${testId}`)
      console.log(`  원래 상태: ${originalStatus}`)
      console.log('\n  cancelled로 변경 시도...')
      
      const { error: updateError } = await supabase
        .from('class_requests')
        .update({ status: 'cancelled', admin_comment: '테스트' })
        .eq('id', testId)

      if (updateError) {
        console.log(`  ❌ 실패: ${updateError.message}`)
        console.log('\n  → DB 제약조건이 아직 업데이트되지 않았습니다.')
        console.log('  → 위의 "방법 1"을 사용해서 SQL을 직접 실행하세요.\n')
      } else {
        console.log('  ✅ 성공! cancelled 상태가 정상 작동합니다.')
        
        // 원래대로 복구
        await supabase
          .from('class_requests')
          .update({ status: originalStatus, admin_comment: null })
          .eq('id', testId)
        
        console.log('  (원래 상태로 복구 완료)\n')
      }
    }

  } catch (error) {
    console.error('오류:', error.message)
  }
}

applyCancelledStatusDirect()
