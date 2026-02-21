'use server'

import { createClient } from '@/utils/supabase/server'

export interface PendingRequest {
  id: string
  date: string
  time_slot: string
  type: 'theory' | 'pool' | 'training'
  location: string
  message?: string
  participants: number
  profiles: {
    name: string | null
    email: string | null
  } | null
  created_at: string
}

export interface PendingCertificate {
  id: number
  level: string
  created_at: string
  profiles: {
    name: string | null
    email: string | null
  } | null
}

export interface DashboardStats {
  todayClasses: any[]
  pendingClassRequests: number
  pendingCertificates: number
  upcomingClassesCount: number
  topPendingRequests: PendingRequest[]
  topPendingCertificates: PendingCertificate[]
}

export async function getAdminDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  
  // 1. 오늘의 수업 조회
  // instructor_id, location_id 등이 없으므로 조인 제거
  // location은 string으로 직접 사용
  const { data: rawTodayClasses, error: todayError } = await supabase
    .from('classes')
    .select(`
      *,
      reservations(count)
    `)
    .eq('date', today)
    .order('time', { ascending: true })

  if (todayError) {
    console.error('Error fetching today classes:', JSON.stringify(todayError, null, 2))
  }

  // 데이터 매핑: DB 컬럼 -> UI 컴포넌트가 기대하는 필드
  const todayClasses = (rawTodayClasses || []).map((cls: any) => ({
    ...cls,
    reservations: cls.reservations, // [{ count: N }] 형태
    class_type: cls.type,
    class_name: cls.title,
    max_students: cls.max_capacity,
    // location은 string으로 들어옴. UI에서 location.name을 기대하므로 객체로 변환하거나 UI 수정 필요.
    // 여기서는 UI 호환성을 위해 location이 string이면 그대로 두고, UI를 수정하는게 낫지만
    // action에서 처리해주면 UI 수정 최소화 가능. 하지만 location은 string이므로 cls.location 사용하도록 UI 수정 권장.
    // 일단 UI에서 cls.location?.name을 쓰므로, 여기서 location 필드를 객체로 만들어줄 수도 있음.
    // 하지만 깔끔하게 UI를 고치는게 정석.
  }))

  // 2. 대기 중인 수업 요청 조회 (class_requests)
  const { count: pendingClassRequests, error: reqError } = await supabase
    .from('class_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (reqError) {
    console.error('Error fetching pending class requests:', reqError)
  }

  // 3. 대기 중인 자격증 신청 조회 (certificates)
  // v2 테이블: public.certificates
  const { count: pendingCertificates, error: certError } = await supabase
    .from('certificates')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  if (certError && certError.code !== '42P01') { // 테이블 없음 에러 제외
    console.error('Error fetching pending certificates:', certError)
  }

  // 4. 이번 주 수업 수 (오늘 포함 향후 7일)
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  const { count: upcomingClassesCount, error: weekError } = await supabase
    .from('classes')
    .select('*', { count: 'exact', head: true })
    .gte('date', today)
    .lte('date', nextWeekStr)

  if (weekError) {
    console.error('Error fetching upcoming classes count:', weekError)
  }

  // 5. 상위 5개 대기 요청 조회 (조인 없이 조회 후 프로필 매핑)
  const { data: rawTopRequests, error: topReqError } = await supabase
    .from('class_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5)

  if (topReqError) {
    console.error('Error fetching top pending requests:', topReqError)
  }

  // 6. 상위 5개 대기 자격증 조회 (조인 없이 조회 후 프로필 매핑)
  const { data: rawTopCertificates, error: topCertError } = await supabase
    .from('certificates')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(5)

  if (topCertError && topCertError.code !== '42P01') { // 테이블 없음 에러 제외
    console.error('Error fetching top pending certificates:', topCertError)
  }

  // 7. 프로필 정보 조회 및 매핑
  const updatesUserIds = (rawTopRequests || []).map((r: any) => r.user_id).filter(Boolean)
  const certUserIds = (rawTopCertificates || []).map((c: any) => c.user_id).filter(Boolean)
  const allUserIds = Array.from(new Set([...updatesUserIds, ...certUserIds]))

  let profilesMap: Record<string, { name: string | null; email: string | null }> = {}

  if (allUserIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', allUserIds)

    if (profileError) {
      console.error('Error fetching profiles for dashboard:', profileError)
    } else {
      profilesMap = (profiles || []).reduce((acc: any, profile: any) => {
        acc[profile.id] = { name: profile.name, email: profile.email }
        return acc
      }, {})
    }
  }

  const topPendingRequests = (rawTopRequests || []).map((req: any) => ({
    id: req.id,
    date: req.date,
    time_slot: req.time_slot,
    type: req.type,
    location: req.location,
    message: req.message,
    participants: req.participants || 1,
    created_at: req.created_at,
    profiles: profilesMap[req.user_id] || null
  }))

  const topPendingCertificates = (rawTopCertificates || []).map((cert: any) => ({
    id: cert.id,
    level: cert.level,
    created_at: cert.created_at,
    profiles: profilesMap[cert.user_id] || null
  }))

  return {
    todayClasses: todayClasses || [],
    pendingClassRequests: pendingClassRequests || 0,
    pendingCertificates: pendingCertificates || 0,
    upcomingClassesCount: upcomingClassesCount || 0,
    topPendingRequests: (topPendingRequests || []) as PendingRequest[],
    topPendingCertificates: (topPendingCertificates || []) as PendingCertificate[],
  }
}
