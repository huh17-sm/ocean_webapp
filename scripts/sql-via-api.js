const { createClient } = require('@supabase/supabase-js')
const https = require('https')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

async function executeSqlViaApi() {
  console.log('🔧 Supabase REST API로 SQL 실행 중...\n')

  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)/)[1]
  
  const sql1 = `alter table public.class_requests drop constraint if exists class_requests_status_check`
  const sql2 = `alter table public.class_requests add constraint class_requests_status_check check (status in ('pending', 'approved', 'rejected', 'cancelled'))`

  console.log('1️⃣ 기존 제약조건 제거...')
  
  const options1 = {
    hostname: `${projectRef}.supabase.co`,
    port: 443,
    path: '/rest/v1/rpc/exec',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  }

  // Supabase는 기본적으로 임의의 SQL 실행을 허용하지 않습니다
  // 대신 pg 모듈을 사용하거나, 직접 Supabase Dashboard를 사용해야 합니다
  
  console.log('⚠️  Supabase REST API는 임의의 SQL 실행을 지원하지 않습니다.\n')
  console.log('💡 대신 다음 방법을 사용하세요:\n')
  console.log('방법 1: Supabase CLI 사용')
  console.log('  npx supabase db execute --sql "alter table public.class_requests drop constraint if exists class_requests_status_check; alter table public.class_requests add constraint class_requests_status_check check (status in (\'pending\', \'approved\', \'rejected\', \'cancelled\'));"')
  console.log('')
  console.log('방법 2: Supabase Dashboard')
  console.log('  1. https://supabase.com/dashboard/project/' + projectRef + '/sql/new')
  console.log('  2. 다음 SQL 실행:')
  console.log('')
  console.log('  alter table public.class_requests drop constraint if exists class_requests_status_check;')
  console.log('  alter table public.class_requests add constraint class_requests_status_check check (status in (\'pending\', \'approved\', \'rejected\', \'cancelled\'));')
  console.log('')
}

executeSqlViaApi()
