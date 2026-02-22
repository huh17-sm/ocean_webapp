'use server'

/**
 * 통합 교육 관리 서버 액션
 *
 * 이 파일은 통합 교육 관리 페이지(/admin/course-management)에서 사용하는
 * 데이터 조회 액션을 포함합니다.
 * - 진행 중인 모든 학생의 교육 현황 조회
 * - 학생 상세 정보(진도 + 스킬 + 자격증) 한 번에 조회
 */

import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'

// ============================================
// 타입 정의
// ============================================

/** 학생 교육 현황 (리스트 노출용) */
export interface StudentEnrollmentSummary {
  userId: string
  userName: string
  userEmail: string
  userPhone: string | null
  courseProgressId: number
  courseLevel: string
  courseTitle: string
  status: string
  theoryCompleted: boolean
  poolSessionsCompleted: number
  startedAt: string | null
  /** 스킬 완료 수 / 총 스킬 수 */
  skillsCompleted: number
  skillsTotal: number
  /** 자격증 상태 ('none' | 'pending' | 'approved' | 'issued' | 'rejected') */
  certStatus: string
  certId: number | null
}

/** 학생 상세 정보 (모달용) */
export interface StudentDetail {
  profile: {
    id: string
    name: string
    email: string
    phone: string | null
  }
  courseProgress: any[]
  skills: any[]
  certificates: any[]
}

// ============================================
// 1. 교육 중인 학생 목록 조회 (리스트용)
// ============================================

/**
 * 교육 등록(in_progress, pending) 상태의 모든 학생 목록 + 요약 정보를 가져옴
 * - course_progress 기준으로 조회
 * - 각 학생별 스킬 완료율과 자격증 상태를 계산해서 반환
 */
export async function getEnrolledStudents(): Promise<StudentEnrollmentSummary[]> {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { data: progressList, error: progressError } = await supabaseAdmin
      .from('course_progress')
      .select(`
        id,
        user_id,
        course_level,
        status,
        theory_completed,
        pool_sessions_completed,
        started_at,
        created_at,
        notes
      `)
      // deleted(휴지통) 상태의 항목도 포함하여 가져옴
      .in('status', ['pending', 'in_progress', 'completed', 'dropped', 'deleted'])
      .order('created_at', { ascending: false })

    if (progressError) {
      console.error('Error fetching course progress:', progressError)
      return []
    }

    if (!progressList || progressList.length === 0) return []

    // 2) 연관된 user_id 수집
    const userIds = [...new Set(progressList.map((p: any) => p.user_id))]

    // 3) 프로필 정보 일괄 조회
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, phone')
      .in('id', userIds)

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))

    // 4) 실제 출석 풀 세션 횟수 일괄 조회
    const { data: attendedPoolSessions } = await supabaseAdmin
      .from('reservations')
      .select('user_id, classes!inner(type)')
      .in('user_id', userIds)
      .eq('status', 'attended')
      .eq('classes.type', 'pool')

    // 유저별 실제 풀 세션 횟수 맵
    const poolSessionMap = new Map<string, number>()
    for (const session of attendedPoolSessions || []) {
      const current = poolSessionMap.get(session.user_id) || 0
      poolSessionMap.set(session.user_id, current + 1)
    }

    // 5) 스킬 현황 일괄 조회
    const { data: allSkills } = await supabaseAdmin
      .from('skill_completions')
      .select('user_id, course_level, skill_type, is_completed')
      .in('user_id', userIds)

    // 6) 자격증 현황 일괄 조회
    const { data: allCerts } = await supabaseAdmin
      .from('certificates')
      .select('id, user_id, certificate_level, status')
      .in('user_id', userIds)

    // 7) 스킬/자격증 맵 구축 (user_id + level → 값)
    const skillMap = new Map<string, { completed: number; total: number }>()
    for (const skill of allSkills || []) {
      const key = `${skill.user_id}_${skill.course_level}`
      const current = skillMap.get(key) || { completed: 0, total: 0 }
      current.total += 1
      if (skill.is_completed) current.completed += 1
      skillMap.set(key, current)
    }

    const certMap = new Map<string, { status: string; id: number }>()
    for (const cert of allCerts || []) {
      const key = `${cert.user_id}_${cert.certificate_level}`
      certMap.set(key, { status: cert.status, id: cert.id })
    }

    // 8) 결과 조합
    const results: StudentEnrollmentSummary[] = progressList.map((p: any) => {
      const profile = profileMap.get(p.user_id)
      const skillKey = `${p.user_id}_${p.course_level}`
      const skillInfo = skillMap.get(skillKey) || { completed: 0, total: 0 }
      const certInfo = certMap.get(skillKey)

      // 스킬 기대 총 수 계산 (입문: 3개, 초급/중급/고급: 5개)
      const expectedSkills = p.course_level === '입문' ? 3 : 5

      return {
        userId: p.user_id,
        userName: profile?.name || '알 수 없음',
        userEmail: profile?.email || '',
        userPhone: profile?.phone || null,
        courseProgressId: p.id,
        courseLevel: p.course_level,
        courseTitle: p.course_level,
        status: p.status,
        theoryCompleted: p.theory_completed || false,
        poolSessionsCompleted: poolSessionMap.get(p.user_id) ?? p.pool_sessions_completed ?? 0,
        startedAt: p.started_at,
        skillsCompleted: skillInfo.completed,
        skillsTotal: Math.max(skillInfo.total, expectedSkills),
        certStatus: certInfo?.status || 'none',
        certId: certInfo?.id || null,
      }
    })

    return results
  } catch (error) {
    console.error('Error in getEnrolledStudents:', error)
    return []
  }
}

// ============================================
// 2. 학생 상세 정보 조회 (모달용)
// ============================================

/**
 * 특정 학생의 상세 교육 정보를 한 번에 조회
 * - 프로필 + 전체 진도 + 스킬 현황 + 자격증 이력
 */
export async function getStudentDetail(userId: string): Promise<StudentDetail | null> {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    // 병렬로 모든 데이터 조회
    const [profileRes, progressRes, coursesRes, skillsRes, certsRes] = await Promise.all([
      // 프로필
      supabaseAdmin
        .from('profiles')
        .select('id, name, email, phone')
        .eq('id', userId)
        .single(),
      // 교육 진도
      supabaseAdmin
        .from('course_progress')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      // 과정을 위한 세션 수 매핑 및 요구 스킬 매핑
      supabaseAdmin
        .from('courses')
        .select('level, session_count, required_skills'),
      // 스킬 현황
      supabaseAdmin
        .from('skill_completions')
        .select('*')
        .eq('user_id', userId)
        .order('course_level', { ascending: true })
        .order('skill_type', { ascending: true }),
      // 자격증 이력
      supabaseAdmin
        .from('certificates')
        .select('*')
        .eq('user_id', userId)
        .order('applied_at', { ascending: false }),
    ])

    if (!profileRes.data) {
      console.error('Profile not found:', userId)
      return null
    }

    // 과정 정보에서 세션 수 및 필수 스킬 맵 구성
    let courseSessionMap: Record<string, number> = {}
    let courseSkillsMap: Record<string, any[]> = {}
    if (coursesRes.data) {
      coursesRes.data.forEach((current) => {
        courseSessionMap[current.level] = current.session_count || 3
        courseSkillsMap[current.level] = current.required_skills || []
      })
    }

    // courseProgress 에 매핑
    const enrichedProgress = (progressRes.data || []).map((p: any) => ({
      ...p,
      session_count: courseSessionMap[p.course_level] || 3,
      required_skills: courseSkillsMap[p.course_level] || []
    }))

    return {
      profile: profileRes.data,
      courseProgress: enrichedProgress,
      skills: skillsRes.data || [],
      certificates: certsRes.data || [],
    }
  } catch (error) {
    console.error('Error in getStudentDetail:', error)
    return null
  }
}

// ============================================
// 3. 사용 가능한 과정 목록 조회 (임의 등록용)
// ============================================

/**
 * ACTIVE 상태의 모든 과정 목록 조회
 */
export async function getActiveCourses() {
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('courses')
    .select('id, title, level, price, status')
    .eq('status', 'ACTIVE')
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Error fetching active courses:', error)
    return []
  }

  return data || []
}

// ============================================
// 4. 실제 출석한 풀 세션 횟수 조회 (연동용)
// ============================================

/**
 * 특정 학생이 실제 출석(attended)한 풀 세션 횟수를 조회
 * - reservations.status = 'attended' + classes.type = 'pool' 기준
 */
export async function getAttendedPoolSessionCount(
  userId: string
): Promise<number> {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    const { count, error } = await supabaseAdmin
      .from('reservations')
      .select('id, classes!inner(type)', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'attended')
      .eq('classes.type', 'pool')

    if (error) {
      console.error('Error counting attended pool sessions:', error)
      return 0
    }

    return count || 0
  } catch (error) {
    console.error('Error in getAttendedPoolSessionCount:', error)
    return 0
  }
}

// ============================================
// 5. 전체 학생(user) 목록 조회 (임의 등록 검색용)
// ============================================

/**
 * 역할이 'user'인 사용자 목록 조회
 */
export async function getAllStudents() {
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, name, email, phone')
    .eq('role', 'user')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching students:', error)
    return []
  }

  return data || []
}

// ============================================
// 6. 교육 과정 삭제 관리 (Soft / Hard Delete)
// ============================================

/**
 * 과정을 휴지통으로 이동 (Soft Delete)
 */
export async function moveToTrash(progressId: number) {
  const supabaseAdmin = getSupabaseAdmin()

  const { error } = await supabaseAdmin
    .from('course_progress')
    .update({ status: 'deleted' })
    .eq('id', progressId)

  if (error) {
    console.error('Error moving progress to trash:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/course-management')
  return { success: true }
}

/**
 * 휴지통에서 과정 복원 (Restore)
 */
export async function restoreFromTrash(progressId: number) {
  const supabaseAdmin = getSupabaseAdmin()

  const { error } = await supabaseAdmin
    .from('course_progress')
    .update({ status: 'in_progress' }) // 기본 복원 상태
    .eq('id', progressId)

  if (error) {
    console.error('Error restoring progress from trash:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/course-management')
  return { success: true }
}

/**
 * 과정 영구 삭제 (Hard Delete)
 */
export async function deletePermanently(progressId: number) {
  const supabaseAdmin = getSupabaseAdmin()

  const { error } = await supabaseAdmin
    .from('course_progress')
    .delete()
    .eq('id', progressId)

  if (error) {
    console.error('Error permanently deleting progress:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/course-management')
  return { success: true }
}

/**
 * 휴지통 비우기 및 다중 영구 삭제
 * @param progressIds 선택된 ID 배열 (없으면 'deleted' 상태인 모든 과정 영구 삭제)
 */
export async function emptyTrash(progressIds?: number[]) {
  const supabaseAdmin = getSupabaseAdmin()
  let query = supabaseAdmin.from('course_progress').delete()

  if (progressIds && progressIds.length > 0) {
    query = query.in('id', progressIds)
  } else {
    // ids 파라미터가 없으면 전체 삭제 모드 (확실히 방어적으로 status 조건 식별)
    query = query.eq('status', 'deleted')
  }

  const { error } = await query

  if (error) {
    console.error('Error emptying trash:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/course-management')
  return { success: true }
}

/**
 * 휴지통에서 다중 복구
 * @param progressIds 선택된 ID 배열 (없으면 'deleted' 상태인 모든 과정 복원)
 */
export async function restoreAllFromTrash(progressIds?: number[]) {
  const supabaseAdmin = getSupabaseAdmin()
  let query = supabaseAdmin.from('course_progress').update({ status: 'in_progress' })

  if (progressIds && progressIds.length > 0) {
    query = query.in('id', progressIds)
  } else {
    // ids 파라미터가 없으면 전체 복원 모드
    query = query.eq('status', 'deleted')
  }

  const { error } = await query

  if (error) {
    console.error('Error restoring all from trash:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/course-management')
  return { success: true }
}
