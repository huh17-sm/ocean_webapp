const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// Service role key로 RLS 우회
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAllRequests() {
  console.log('🔍 모든 클래스 요청 확인 중...\n')

  const { data: requests, error } = await supabase
    .from('class_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ 오류:', error.message)
    return
  }

  if (!requests || requests.length === 0) {
    console.log('⚠️  클래스 요청이 없습니다.')
    return
  }

  console.log(`✅ 총 ${requests.length}개의 요청 발견:\n`)
  
  requests.forEach((req, i) => {
    console.log(`${i + 1}. [${req.status.toUpperCase()}] ${req.type}`)
    console.log(`   날짜: ${req.date}`)
    console.log(`   시간: ${req.time_slot}`)
    console.log(`   장소: ${req.location}`)
    console.log(`   사용자: ${req.user_id}`)
    console.log(`   생성: ${req.created_at}`)
    console.log('')
  })

  // 상태별 집계
  const byStatus = requests.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1
    return acc
  }, {})

  console.log('\n📊 상태별 통계:')
  console.log(`   Pending: ${byStatus.pending || 0}`)
  console.log(`   Approved: ${byStatus.approved || 0}`)
  console.log(`   Rejected: ${byStatus.rejected || 0}`)
}

checkAllRequests()
