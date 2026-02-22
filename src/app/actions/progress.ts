'use server'

/**
 * 교육 진도 관리 서버 액션 (사용자용)
 *
 * 이 파일은 교육생의 진도 조회 관련 서버 액션을 포함합니다:
 * - 내 진도 보기 (course_progress)
 * - 내 스킬 완료 현황 (skill_completions)
 * - 수업 완료 내역 (debriefings)
 */

import { createClient } from '@/utils/supabase/server'

// ============================================
// 1. 내 진도 조회 (Course Progress)
// ============================================

export interface CourseProgress {
  id: number
  user_id: string
  course_level: string
  status: 'pending' | 'in_progress' | 'completed' | 'dropped'
  theory_completed: boolean
  pool_sessions_completed: number
  applied_at?: string
  started_at: string
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  session_count?: number // 추가된 속성
  required_skills?: { type: string; requirement: string }[] // 추가된 속성
}

/**
 * 사용자의 교육 진도 조회
 */
export async function getMyCourseProgress(): Promise<CourseProgress[]> {
  const supabase = await createClient()

  // 1. 현재 사용자 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  // 2. 진도 조회
  const { data, error } = await supabase
    .from('course_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })

  if (error) {
    console.error('Error fetching course progress:', JSON.stringify(error, null, 2))
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })

    // 모든 에러에 대해 빈 배열 반환하여 대시보드 렌더링 차단 방지
    return []
  }

  // 3. 과정(courses) 정보 조회하여 session_count, required_skills 매핑
  const { data: coursesData, error: coursesError } = await supabase
    .from('courses')
    .select('level, session_count, required_skills')

  let courseSessionMap: Record<string, number> = {}
  let courseSkillsMap: Record<string, any[]> = {}
  
  if (!coursesError && coursesData) {
    coursesData.forEach(current => {
      courseSessionMap[current.level] = current.session_count || 3
      courseSkillsMap[current.level] = current.required_skills || []
    })
  }

  // 매핑 데이터 리턴
  const enrichedData = (data || []).map(p => ({
    ...p,
    session_count: courseSessionMap[p.course_level] || 3, // 못 찾을 경우 3 기본값
    required_skills: courseSkillsMap[p.course_level] || []
  }))

  return enrichedData
}

/**
 * 특정 코스의 진도 조회
 */
export async function getCourseProgressByLevel(
  courseLevel: string
): Promise<CourseProgress | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { data, error } = await supabase
    .from('course_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_level', courseLevel)
    .maybeSingle()

  if (error) {
    console.error('Error fetching course progress by level:', error)
    throw new Error('진도 조회에 실패했습니다.')
  }

  return data
}

// ============================================
// 2. 내 스킬 완료 현황 (Skill Completions)
// ============================================

export interface SkillCompletion {
  id: number
  user_id: string
  course_level: string
  skill_type: 'static' | 'dynamic' | 'depth' | 'rescue' | 'theory'
  is_completed: boolean
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * 사용자의 스킬 완료 현황 조회
 */
export async function getMySkillCompletions(): Promise<SkillCompletion[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { data, error } = await supabase
    .from('skill_completions')
    .select('*')
    .eq('user_id', user.id)
    .order('course_level', { ascending: true })
    .order('skill_type', { ascending: true })

  if (error) {
    console.error('Error fetching skill completions:', error)
    throw new Error('스킬 완료 현황 조회에 실패했습니다.')
  }

  return data || []
}

/**
 * 특정 코스의 스킬 완료 현황 조회
 */
export async function getSkillCompletionsByLevel(
  courseLevel: string
): Promise<SkillCompletion[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { data, error } = await supabase
    .from('skill_completions')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_level', courseLevel)
    .order('skill_type', { ascending: true })

  if (error) {
    console.error('Error fetching skill completions by level:', error)
    throw new Error('스킬 완료 현황 조회에 실패했습니다.')
  }

  return data || []
}

// ============================================
// 3. 수업 완료 내역 (Debriefings)
// ============================================

export interface MyDebriefing {
  id: number
  reservation_id: string
  instructor_id: string
  performance: string | null
  improvement: string | null
  strengths: string | null
  next_goal: string | null
  created_at: string
  updated_at: string
  // 조인된 데이터
  reservation?: {
    class_id: string
    classes?: {
      date: string
      time: string
      type: string
      location: string
      media_link: string | null
      title: string | null
    }
  }
  instructor?: {
    name: string
  }
}

/**
 * 사용자의 수업 완료 내역 (디브리핑) 조회
 */
export async function getMyDebriefings(): Promise<MyDebriefing[]> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  // debriefings 테이블에서 내 예약과 연결된 디브리핑 조회
  const { data, error } = await supabase
    .from('debriefings')
    .select(
      `
      *,
      reservation:reservations!inner(
        class_id,
        user_id,
        classes(date, time, type, location, media_link, title)
      ),
      instructor:profiles!debriefings_instructor_id_fkey(name)
    `
    )
    .eq('reservation.user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching debriefings:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    // 에러 발생 시 빈 배열 반환하여 대시보드 렌더링 차단 방지
    return []
  }

  return data || []
}

/**
 * 특정 예약의 디브리핑 조회
 */
export async function getDebriefingByReservation(
  reservationId: string
): Promise<MyDebriefing | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { data, error } = await supabase
    .from('debriefings')
    .select(
      `
      *,
      reservation:reservations!inner(
        class_id,
        user_id,
        classes(date, time, type, location, media_link, title)
      ),
      instructor:profiles!debriefings_instructor_id_fkey(name)
    `
    )
    .eq('reservation_id', reservationId)
    .eq('reservation.user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching debriefing by reservation:', error)
    throw new Error('디브리핑 조회에 실패했습니다.')
  }

  return data
}

// ============================================
// 4. 통합 진도 현황 (코스 + 스킬 + 디브리핑)
// ============================================

export interface MyProgressSummary {
  courseProgress: CourseProgress[]
  skillCompletions: SkillCompletion[]
  debriefings: MyDebriefing[]
  certificates?: any[]
}

/**
 * 사용자의 전체 진도 현황 조회
 */
export async function getMyProgressSummary(): Promise<MyProgressSummary> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [courseProgress, skillCompletions, debriefings] = await Promise.all([
    getMyCourseProgress(),
    getMySkillCompletions(),
    getMyDebriefings(),
  ])

  let certificates = []
  if (user) {
    const { data } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user.id)
    certificates = data || []
  }

  return {
    courseProgress,
    skillCompletions,
    debriefings,
    certificates,
  }
}
