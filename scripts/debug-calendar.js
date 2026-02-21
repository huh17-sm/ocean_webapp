const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugCalendarData() {
  console.log('🔍 캘린더 데이터 디버깅 시작...\n')

  // 1. 모든 pending 요청 확인
  console.log('📋 === Pending 클래스 요청 ===')
  const { data: requests, error: reqError } = await supabase
    .from('class_requests')
    .select('*')
    .eq('status', 'pending')
    .order('date', { ascending: true })

  if (reqError) {
    console.error('❌ 요청 조회 오류:', reqError.message)
  } else if (!requests || requests.length === 0) {
    console.log('⚠️  pending 상태의 요청이 없습니다.')
  } else {
    console.log(`✅ ${requests.length}개의 pending 요청 발견:`)
    requests.forEach((req, i) => {
      console.log(`\n   ${i + 1}. ${req.date} | ${req.time_slot} | ${req.type}`)
      console.log(`      장소: ${req.location}`)
      console.log(`      상태: ${req.status}`)
    })
  }

  // 2. 모든 수업 확인
  console.log('\n\n🎓 === 등록된 수업 (Classes) ===')
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('*')
    .order('date', { ascending: true })
    .limit(10)

  if (classError) {
    console.error('❌ 수업 조회 오류:', classError.message)
  } else if (!classes || classes.length === 0) {
    console.log('⚠️  등록된 수업이 없습니다.')
  } else {
    console.log(`✅ ${classes.length}개의 수업 발견 (최근 10개):`)
    classes.forEach((cls, i) => {
      console.log(`\n   ${i + 1}. ${cls.date} | ${cls.time} | ${cls.type}`)
      console.log(`      장소: ${cls.location || '미지정'}`)
      console.log(`      정원: ${cls.current_enrollment}/${cls.max_capacity}`)
    })
  }

  // 3. 모든 상태의 요청 개수 확인
  console.log('\n\n📊 === 요청 상태별 통계 ===')
  const { data: allRequests } = await supabase
    .from('class_requests')
    .select('status')

  if (allRequests) {
    const statusCount = allRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1
      return acc
    }, {})
    
    console.log('   - pending:', statusCount.pending || 0)
    console.log('   - approved:', statusCount.approved || 0)
    console.log('   - rejected:', statusCount.rejected || 0)
  }

  console.log('\n✅ 디버깅 완료!')
}

debugCalendarData()
