const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndSync() {
  console.log('🔍 현재 상태 확인 중...\n')

  // 1. 모든 승인된 요청 가져오기
  const { data: requests, error: reqError } = await supabase
    .from('class_requests')
    .select('*')
    .eq('status', 'approved')
    .order('date', { ascending: true })

  if (reqError) {
    console.error('❌ 요청 조회 실패:', reqError.message)
    return
  }

  console.log(`📋 승인된 요청: ${requests.length}개\n`)

  // 2. 모든 수업 가져오기
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('*')
    .order('date', { ascending: true })

  if (classError) {
    console.error('❌ 수업 조회 실패:', classError.message)
    return
  }

  console.log(`🎓 개설된 수업: ${classes.length}개\n`)

  // 3. 각 요청에 대해 대응하는 수업이 있는지 확인
  console.log('🔄 요청과 수업 대조 중...\n')

  const toCancelIds = []

  for (const req of requests) {
    // 시간 정규화
    let reqTime = req.time_slot
    if (reqTime.includes('-')) {
      reqTime = reqTime.split('-')[0].trim()
    }
    const reqTimeParts = reqTime.split(':')
    const reqTimeNormalized = reqTimeParts.length >= 2 
      ? `${reqTimeParts[0]}:${reqTimeParts[1]}` 
      : reqTime

    console.log(`📝 요청: ${req.date} | ${req.time_slot} (${reqTimeNormalized}) | ${req.type} | ${req.location}`)

    // 일치하는 수업 찾기
    const matchingClass = classes.find(cls => {
      // 수업 시간 정규화
      const clsTimeParts = cls.time?.split(':') || []
      const clsTimeNormalized = clsTimeParts.length >= 2
        ? `${clsTimeParts[0]}:${clsTimeParts[1]}`
        : cls.time

      return cls.date === req.date &&
             clsTimeNormalized === reqTimeNormalized &&
             cls.type === req.type &&
             cls.location === req.location
    })

    if (matchingClass) {
      console.log(`   ✅ 수업 존재: ${matchingClass.id}`)
    } else {
      console.log(`   ❌ 수업 없음 → cancelled로 변경 필요`)
      toCancelIds.push(req.id)
    }
    console.log('')
  }

  // 4. cancelled로 변경할 요청들 업데이트
  if (toCancelIds.length > 0) {
    console.log(`\n🔧 ${toCancelIds.length}개 요청을 cancelled로 변경 중...\n`)

    for (const id of toCancelIds) {
      const { error } = await supabase
        .from('class_requests')
        .update({ 
          status: 'cancelled',
          admin_comment: '관리자가 수업을 취소했습니다.'
        })
        .eq('id', id)

      if (error) {
        console.log(`   ❌ ${id}: ${error.message}`)
      } else {
        console.log(`   ✅ ${id}: cancelled로 변경 완료`)
      }
    }

    console.log('\n✅ 동기화 완료!')
  } else {
    console.log('\n✅ 모든 요청이 수업과 일치합니다. 변경 불필요.')
  }
}

checkAndSync()
