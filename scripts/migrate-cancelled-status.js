const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyCancelledStatus() {
  console.log('🔧 cancelled 상태 추가 중...\n')

  // SQL 실행
  const { error } = await supabase.rpc('execute_sql', {
    sql_query: `
      alter table public.class_requests 
      drop constraint if exists class_requests_status_check;
      
      alter table public.class_requests
      add constraint class_requests_status_check 
      check (status in ('pending', 'approved', 'rejected', 'cancelled'));
    `
  })

  if (error) {
    console.error('❌ 마이그레이션 실패:', error.message)
    console.log('\n📝 수동으로 Supabase Dashboard에서 실행하세요:')
    console.log(`
      alter table public.class_requests 
      drop constraint if exists class_requests_status_check;
      
      alter table public.class_requests
      add constraint class_requests_status_check 
      check (status in ('pending', 'approved', 'rejected', 'cancelled'));
    `)
  } else {
    console.log('✅ cancelled 상태 추가 완료!')
  }
}

applyCancelledStatus()
