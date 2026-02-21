import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DebriefingManagement } from '@/components/admin/debriefing-management'
import { getSupabaseAdmin } from '@/utils/supabase/admin'

// 캐싱 방지
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminDebriefingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['instructor', 'admin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  // 최근 수업 목록 가져오기 (최근 30일)
  const supabaseAdmin = getSupabaseAdmin()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: classes } = await supabaseAdmin
    .from('classes')
    .select('id, date, time, type, location')
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .order('time', { ascending: false })
    .limit(50)

  return (
    <div className="container mx-auto p-6 max-w-7xl pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">디브리핑 관리</h1>
        <p className="text-slate-500 mt-2">
          수업별로 학생들에게 피드백을 작성하고 일괄 저장하세요
        </p>
      </div>

      <DebriefingManagement classes={classes || []} instructorId={user.id} />
    </div>
  )
}
