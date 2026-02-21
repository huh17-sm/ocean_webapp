import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getSupabaseAdmin } from '@/utils/supabase/admin'
import { ClassDetailView } from '@/components/admin/class-detail-view'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClassDetailPage({ params }: PageProps) {
  const { id: classId } = await params

  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

  // 권한 확인
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

  // 수업 정보 가져오기
  const { data: classInfo } = await supabaseAdmin
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single()

  if (!classInfo) {
    redirect('/admin/classes/availability')
  }

  // 참석자 목록 가져오기
  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select(`
      id,
      user_id,
      status,
      credit_cost,
      profiles:user_id (
        id,
        name,
        email,
        phone_number:phone
      )
    `)
    .eq('class_id', classId)
    .in('status', ['confirmed', 'attended'])
    .order('created_at', { ascending: true })

  // 기존 디브리핑 가져오기
  const { data: existingDebriefings } = await supabaseAdmin
    .from('debriefings')
    .select(`
      id,
      reservation_id,
      performance,
      improvement,
      strengths,
      next_goal
    `)
    .in(
      'reservation_id',
      (reservations || []).map((r) => r.id)
    )
  // 참석자 데이터 변환: Supabase 조인 결과에서 profiles 배열을 단일 객체로
  const transformedReservations = (reservations || []).map((r: any) => ({
    ...r,
    profiles: Array.isArray(r.profiles) ? r.profiles[0] : r.profiles,
  }))

  return (
    <ClassDetailView
      classInfo={classInfo}
      reservations={transformedReservations}
      existingDebriefings={existingDebriefings || []}
      instructorId={user.id}
    />
  )
}
