import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardHome } from '@/components/dashboard/dashboard-home'
import { getCreditTransactions } from '@/app/admin/actions/credits'
import { getMyCourseProgress, getMyDebriefings } from '@/app/actions/progress'

// 캐싱 방지
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 다가오는 수업 (예약된 것 중 미래)
    // 다가오는 수업 (예약된 것 중 미래)
  const { data: upcomingReservationsData } = await supabase
    .from('reservations')
    .select('*, classes!inner(*)') // !inner를 사용해 클래스 정보가 있는 것만 조회
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .gte('classes.date', new Date().toISOString().split('T')[0])
    .limit(20) // DB 정렬 이슈 방지를 위해 넉넉히 가져와서 JS로 정렬

  // 날짜/시간순 정렬 (DB 정렬 .order('classes.date')가 외래키라 종종 실패함)
  const upcomingReservations = (upcomingReservationsData || [])
    .sort((a: any, b: any) => {
      const dateA = new Date(a.classes.date).getTime()
      const dateB = new Date(b.classes.date).getTime()
      if (dateA !== dateB) return dateA - dateB
      return a.classes.time.localeCompare(b.classes.time)
    })
    .slice(0, 3)

  // 내 진도
  let courseProgress: any[] = []
  try {
    courseProgress = await getMyCourseProgress()
  } catch (error) {
    console.error('Error in getMyCourseProgress:', error)
  }

  // 최근 디브리핑 (1개)
  let debriefings: any[] = []
  let latestDebriefing = null
  try {
    debriefings = await getMyDebriefings()
    latestDebriefing = debriefings[0] || null
  } catch (error) {
    console.error('Error in getMyDebriefings:', error)
  }

  // 크레딧 거래 내역
  let creditTransactions: any[] = []
  try {
    creditTransactions = await getCreditTransactions(user.id)
  } catch (error) {
    console.error('Error in getCreditTransactions:', error)
  }

  // TODO: 만료 예정 크레딧 기능은 향후 구현 예정
  const expiringCredits = 0

  return (
    <DashboardHome
      profile={profile}
      upcomingReservations={upcomingReservations || []}
      courseProgress={courseProgress}
      latestDebriefing={latestDebriefing}
      expiringCredits={expiringCredits}
    />
  )
}
