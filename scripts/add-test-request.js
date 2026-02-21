const { createClient } = require('@supabase/supabase-js')

// Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addTestClassRequest() {
  console.log('🔍 테스트용 클래스 요청 데이터를 추가합니다...\n')

  // 1. 먼저 사용자 ID를 가져옴 (첫 번째 사용자 사용)
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('id, email, name')
    .limit(1)

  if (userError || !users || users.length === 0) {
    console.error('❌ 사용자를 찾을 수 없습니다:', userError)
    return
  }

  const testUser = users[0]
  console.log(`✅ 사용자 찾음: ${testUser.email} (${testUser.name})`)

  // 2. 오늘 날짜로 테스트 요청 추가
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD 형식

  const { data, error } = await supabase
    .from('class_requests')
    .insert({
      user_id: testUser.id,
      date: today,
      type: 'pool',
      time_slot: '14:00',
      location: '강남 수영장',
      status: 'pending'
    })
    .select()

  if (error) {
    console.error('❌ 클래스 요청 추가 실패:', error.message)
  } else {
    console.log('✅ 테스트 클래스 요청이 성공적으로 추가되었습니다!')
    console.log('   - 날짜:', today)
    console.log('   - 종류: pool (풀장)')
    console.log('   - 시간: 14:00')
    console.log('   - 장소: 강남 수영장')
    console.log('\n🎯 이제 관리자 패널에서 확인해보세요!')
  }

  // 3. 모든 pending 요청 확인
  const { data: allRequests } = await supabase
    .from('class_requests')
    .select('*')
    .eq('status', 'pending')

  console.log(`\n📋 현재 대기 중인 요청: ${allRequests?.length || 0}개`)
}

addTestClassRequest()
