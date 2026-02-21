const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createMissingClasses() {
  console.log('🔧 승인된 요청에 대한 수업 생성 중...\n')

  // 승인된 요청 가져오기
  const { data: requests, error: fetchError } = await supabase
    .from('class_requests')
    .select('*')
    .eq('status', 'approved')

  if (fetchError || !requests) {
    console.error('❌ 요청 조회 실패:', fetchError?.message)
    return
  }

  console.log(`✅ ${requests.length}개의 승인된 요청 발견\n`)

  for (const req of requests) {
    // 시간 변환
    let classTime = req.time_slot
    
    if (classTime.toLowerCase().includes('morning') || classTime === '오전') {
      classTime = '10:00'
    } else if (classTime.toLowerCase().includes('afternoon') || classTime === '오후') {
      classTime = '14:00'
    } else if (classTime.toLowerCase().includes('evening') || classTime === '저녁') {
      classTime = '18:00'
    }
    
    if (classTime.includes('-')) {
      classTime = classTime.split('-')[0].trim()
    }
    
    const timeParts = classTime.split(':')
    if (timeParts.length === 3) {
      classTime = `${timeParts[0]}:${timeParts[1]}`
    }

    console.log(`📝 수업 생성 시도:`)
    console.log(`   날짜: ${req.date}`)
    console.log(`   시간: ${req.time_slot} → ${classTime}`)
    console.log(`   타입: ${req.type}`)
    console.log(`   장소: ${req.location}`)

    // 이미 존재하는지 확인
    const { data: existing } = await supabase
      .from('classes')
      .select('*')
      .eq('date', req.date)
      .eq('time', classTime)
      .eq('type', req.type)
      .eq('location', req.location)

    if (existing && existing.length > 0) {
      console.log(`   ⏭️  이미 존재함 (ID: ${existing[0].id})\n`)
      continue
    }

    // 수업 생성
    const { data: created, error: createError } = await supabase
      .from('classes')
      .insert({
        date: req.date,
        time: classTime,
        type: req.type,
        location: req.location,
        max_capacity: 4,
        current_enrollment: 0
      })
      .select()

    if (createError) {
      console.error(`   ❌ 생성 실패:`, createError.message)
    } else {
      console.log(`   ✅ 생성 성공! (ID: ${created[0].id})`)
    }
    console.log('')
  }

  console.log('✅ 완료!')
}

createMissingClasses()
