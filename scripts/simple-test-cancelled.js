const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCancelledStatus() {
  console.log('🧪 cancelled 상태 테스트 중...\n')

  // 테스트용 요청 가져오기
  const { data: requests, error: fetchError } = await supabase
    .from('class_requests')
    .select('id, status')
    .limit(1)

  if (fetchError || !requests || requests.length === 0) {
    console.log('❌ 테스트할 요청이 없습니다.')
    return
  }

  const testRequest = requests[0]
  console.log(`📝 테스트 요청:`)
  console.log(`   ID: ${testRequest.id}`)
  console.log(`   현재 상태: ${testRequest.status}\n`)

  // cancelled 상태로 변경 시도
  console.log('🔄 cancelled 상태로 변경 시도...')
  const { error: updateError } = await supabase
    .from('class_requests')
    .update({ 
      status: 'cancelled',
      admin_comment: '테스트: 관리자가 수업을 취소했습니다.'
    })
    .eq('id', testRequest.id)

  if (updateError) {
    console.log(`❌ 실패: ${updateError.message}\n`)
    console.log('💡 해결 방법:')
    console.log('   Supabase Dashboard → SQL Editor에서 다음 SQL을 실행하세요:\n')
    console.log('   alter table public.class_requests drop constraint if exists class_requests_status_check;')
    console.log('   alter table public.class_requests add constraint class_requests_status_check')
    console.log('   check (status in (\'pending\', \'approved\', \'rejected\', \'cancelled\'));\n')
  } else {
    console.log('✅ 성공! cancelled 상태가 정상 작동합니다.\n')
    
    // 확인
    const { data: updated } = await supabase
      .from('class_requests')
      .select('status, admin_comment')
      .eq('id', testRequest.id)
      .single()
    
    if (updated) {
      console.log('📊 업데이트된 데이터:')
      console.log(`   상태: ${updated.status}`)
      console.log(`   코멘트: ${updated.admin_comment}\n`)
    }
    
    // 원래대로 복구
    console.log('🔄 원래 상태로 복구 중...')
    await supabase
      .from('class_requests')
      .update({ 
        status: testRequest.status,
        admin_comment: null
      })
      .eq('id', testRequest.id)
    
    console.log('✅ 복구 완료!\n')
  }
}

testCancelledStatus()
