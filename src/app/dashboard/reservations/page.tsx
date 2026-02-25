import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { ReservationsView } from '@/components/dashboard/reservations-view'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ReservationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 모든 예약 내역 조회 (예정/완료/취소 모두 포함)
  const { data: reservations } = await supabase
    .from('reservations')
    .select(`
      *,
      classes (
        id,
        date,
        time,
        type,
        location,
        max_capacity
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // 수업 날짜(classes.date) 기준으로 내림차순 재정렬 (최신 수업이 먼저 보이도록)
  const sorted = (reservations || []).sort((a: any, b: any) => {
    const dateA = a.classes?.date || ''
    const dateB = b.classes?.date || ''
    return dateB.localeCompare(dateA)
  })

  return <ReservationsView reservations={sorted} />
}
