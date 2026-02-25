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
    .select('id, date, time, type, location, is_completed, media_link, title')
    // .eq('is_completed', true) <-- 이 필터로 인해 미완료/진행중 수업이 안보이던 것을 제거
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })
    .order('time', { ascending: false })
    .limit(50)

  // 작성 대상 필터: 이미 완료됐거나(is_completed) 시간이 지난(과거인) 수업만 반환
  const now = new Date()
  const filteredClasses = classes?.filter((c) => {
    if (c.is_completed) return true

    // KST 기준으로 시간 비교
    const timeStr = c.time.length === 5 ? `${c.time}:00` : c.time
    const classDateTime = new Date(`${c.date}T${timeStr}+09:00`)
    return classDateTime < now
  }) || []

  // 각 수업의 출석 학생 수 및 작성된 디브리핑 수 확인
  const classIds = filteredClasses.map((c) => c.id)

  const { data: attendees } = await supabaseAdmin
    .from('reservations')
    .select('id, class_id')
    .in('class_id', classIds)
    .in('status', ['attended', 'confirmed'])

  const { data: debriefings } = await supabaseAdmin
    .from('debriefings')
    .select('id, reservation:reservations!inner(class_id)')
    .in('reservation.class_id', classIds)

  const classesWithStatus = filteredClasses.map((c) => {
    const classAttendees = attendees?.filter((a) => a.class_id === c.id) || []
    const classDebriefings = debriefings?.filter(
      (d) => (d.reservation as any).class_id === c.id
    ) || []

    // 출석한 학생이 없으면 디브리핑 작성할 대상이 없으므로 완료 처리,
    // 출석한 학생 수와 작성된 디브리핑 수가 같거나 많으면 완료 처리
    const hasPendingDebriefing =
      classAttendees.length > 0 && classDebriefings.length < classAttendees.length

    return {
      ...c,
      hasPendingDebriefing,
    }
  })

  return (
    <div className="container mx-auto p-6 max-w-7xl pb-20">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">디브리핑 관리</h1>
        <p className="text-slate-500 mt-2">
          수업별로 학생들에게 피드백을 작성하고 일괄 저장하세요
        </p>
      </div>

      <DebriefingManagement classes={classesWithStatus} instructorId={user.id} />
    </div>
  )
}
