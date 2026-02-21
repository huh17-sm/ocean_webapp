'use server'

/**
 * 과정 등록 신청 서버 액션 (사용자용)
 *
 * 이 파일은 사용자가 과정을 신청하는 워크플로우를 포함합니다:
 * - requestCourseRegistration: 과정 신청
 * - getMyCourseApplications: 신청 내역 조회
 * - cancelCourseApplication: 신청 취소
 */

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// 1. 과정 신청 (사용자)
// ============================================

export interface CourseEnrollmentResult {
  success: boolean
  message: string
  progressId?: number
}

/**
 * 사용자가 과정 신청
 * - 과정 정보 확인
 * - 중복 신청 확인 (동일 course_level의 pending/in_progress 불가)
 * - course_progress INSERT (status='pending')
 * @param courseId 과정 ID (courses 테이블의 id)
 */
export async function requestCourseRegistration(
  courseId: string
): Promise<CourseEnrollmentResult> {
  const supabase = await createClient()

  try {
    // 1. 현재 사용자 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: '로그인이 필요합니다.' }
    }

    // 2. courses 테이블에서 courseId로 과정 조회
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, level, status, price')
      .eq('id', courseId)
      .maybeSingle()

    if (courseError || !course) {
      console.error('Error fetching course:', courseError)
      return { success: false, message: '과정 정보를 찾을 수 없습니다.' }
    }

    // 3. 과정이 활성 상태인지 확인
    if (course.status !== 'ACTIVE') {
      return {
        success: false,
        message: '현재 신청할 수 없는 과정입니다.',
      }
    }

    // 4. course_level 추출 (과정의 level 사용)
    const courseLevel = course.level || courseId
    console.log('Checking enrollment for:', { userId: user.id, courseLevel, courseId })

    // 5. 같은 course_level의 레코드 확인 (모든 상태)
    const { data: existingRecords, error: existingError } = await supabase
      .from('course_progress')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('course_level', courseLevel)
      .limit(1) // 중복이 있어도 하나만 가져옴

    console.log('Existing enrollment check result:', { existingRecords, existingError })

    if (existingError) {
      console.error('Error checking existing enrollment:', existingError)
      return { success: false, message: `신청 확인 중 오류가 발생했습니다. (${existingError.message})` }
    }

    const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null

    // 5-1. 이미 진행 중이거나 대기 중인 경우
    if (existingRecord && ['pending', 'in_progress'].includes(existingRecord.status)) {
      return {
        success: false,
        message: '이미 신청했거나 진행 중인 과정입니다.',
      }
    }

    let progressData
    let operationError

    // 6. 신청 처리 (Insert 또는 Update)
    if (existingRecord) {
      // 6-1. 기존 레코드(dropped, completed 등)가 있으면 Update
      // 재신청 시 상태를 pending으로 변경하고 신청일 갱신
      const { data, error } = await supabase
        .from('course_progress')
        .update({
          status: 'pending',
          course_id: courseId, // 혹시 course_id가 바뀔 수 있으므로 업데이트
          applied_at: new Date().toISOString(),
          notes: null, // 기존 거부 사유 초기화
          approved_by: null,
          approved_at: null,
        })
        .eq('id', existingRecord.id)
        .select('id')
      
      // 배열의 첫 번째 요소 선택 (없으면 undefined)
      progressData = data ? data[0] : null
      operationError = error
    } else {
      // 6-2. 기존 레코드가 없으면 Insert
      const { data, error } = await supabase
        .from('course_progress')
        .insert({
          user_id: user.id,
          course_id: courseId,
          course_level: courseLevel,
          status: 'pending',
          applied_at: new Date().toISOString(),
        })
        .select('id')
      
      // 배열의 첫 번째 요소 선택
      progressData = data ? data[0] : null
      operationError = error
    }

    if (operationError || !progressData) {
      console.error('Error creating/updating course application:', operationError)
      console.error('Operation error details:', {
        code: operationError?.code,
        message: operationError?.message,
        details: operationError?.details,
        hint: operationError?.hint,
      })
      return {
        success: false,
        message: `과정 신청에 실패했습니다. ${operationError?.message || ''}`,
      }
    }

    // 7. revalidatePath
    revalidatePath('/dashboard')
    revalidatePath('/admin')

    return {
      success: true,
      message: '과정 신청이 완료되었습니다. 관리자의 승인을 기다려주세요.',
      progressId: progressData.id,
    }
  } catch (error) {
    console.error('Error in requestCourseRegistration:', error)
    return {
      success: false,
      message: '과정 신청 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 2. 내 과정 신청 내역 조회
// ============================================

export interface MyCourseApplication {
  id: number
  user_id: string
  course_id: string | null
  course_level: string
  status: 'pending' | 'in_progress' | 'completed' | 'dropped'
  applied_at: string
  started_at: string | null
  completed_at: string | null
  credits_granted: number
  created_at: string
  updated_at: string
  // 조인된 데이터
  courses?: {
    id: string
    title: string
    level: string
    price: any
    curriculum_details: string[]
  }
}

/**
 * 사용자의 모든 과정 신청 및 진도 조회
 * - pending 신청 포함
 * - courses 테이블과 JOIN하여 상세 정보 포함
 */
export async function getMyCourseApplications(): Promise<MyCourseApplication[]> {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('로그인이 필요합니다.')
    }

    // course_progress + courses 조인
    const { data, error } = await supabase
      .from('course_progress')
      .select(
        `
        *,
        courses!inner(id, title, level, price, curriculum_details)
      `
      )
      .eq('user_id', user.id)
      .order('applied_at', { ascending: false })

    if (error) {
      console.error('Error fetching course applications:', error)
      throw new Error('과정 신청 내역 조회에 실패했습니다.')
    }

    return (data || []) as MyCourseApplication[]
  } catch (error) {
    console.error('Error in getMyCourseApplications:', error)
    throw error
  }
}

// ============================================
// 2-1. 신청 가능한 과정 목록 조회
// ============================================

export interface AvailableCourse {
  id: string
  title: string
  level: string
  description?: string
  price: any
  duration?: string
  certification?: string
  curriculum_details: string[]
  features?: string[]
  status: string
  userHasApplied?: boolean
  userApplicationStatus?: 'pending' | 'in_progress' | 'completed' | 'dropped'
}

/**
 * 사용자가 신청 가능한 과정 목록 조회
 * - ACTIVE 상태의 과정만 조회
 * - 사용자가 이미 신청했는지 여부 포함
 */
export async function getAvailableCourses(): Promise<AvailableCourse[]> {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // 1. ACTIVE 과정 조회
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('sort_order', { ascending: true })

    if (coursesError) {
      console.error('Error fetching courses:', coursesError)
      throw new Error('과정 목록 조회에 실패했습니다.')
    }

    if (!user) {
      // 로그인하지 않은 경우, 신청 상태 없이 과정만 반환
      return (courses || []).map((course) => ({
        ...course,
        userHasApplied: false,
      }))
    }

    // 2. 사용자의 과정 진도 조회 (신청 여부 확인)
    const { data: userProgress } = await supabase
      .from('course_progress')
      .select('course_level, status')
      .eq('user_id', user.id)

    // 3. 과정별 신청 상태 매핑
    const progressMap = new Map(
      (userProgress || []).map((p) => [p.course_level, p.status])
    )

    return (courses || []).map((course) => {
      const courseLevel = course.level || course.id
      const userStatus = progressMap.get(courseLevel)

      return {
        ...course,
        userHasApplied: !!userStatus,
        userApplicationStatus: userStatus,
      }
    })
  } catch (error) {
    console.error('Error in getAvailableCourses:', error)
    throw error
  }
}

// ============================================
// 3. 과정 신청 취소 (pending만 가능)
// ============================================

/**
 * 사용자가 pending 상태의 신청만 취소 가능
 * @param progressId course_progress 테이블의 id
 */
export async function cancelCourseApplication(
  progressId: number
): Promise<CourseEnrollmentResult> {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: '로그인이 필요합니다.' }
    }

    // 1. 신청 조회 및 권한 확인
    const { data: progress, error: fetchError } = await supabase
      .from('course_progress')
      .select('id, user_id, status')
      .eq('id', progressId)
      .maybeSingle()

    if (fetchError || !progress) {
      return { success: false, message: '신청 정보를 찾을 수 없습니다.' }
    }

    // 2. 본인 소유 확인
    if (progress.user_id !== user.id) {
      return { success: false, message: '권한이 없습니다.' }
    }

    // 3. pending 상태만 취소 가능
    if (progress.status !== 'pending') {
      return {
        success: false,
        message: '대기 중인 신청만 취소할 수 있습니다.',
      }
    }

    // 4. 레코드 삭제
    const { error: deleteError } = await supabase
      .from('course_progress')
      .delete()
      .eq('id', progressId)

    if (deleteError) {
      console.error('Error canceling course application:', deleteError)
      return { success: false, message: '신청 취소에 실패했습니다.' }
    }

    // 5. revalidatePath
    revalidatePath('/dashboard')
    revalidatePath('/admin')

    return {
      success: true,
      message: '과정 신청이 취소되었습니다.',
    }
  } catch (error) {
    console.error('Error in cancelCourseApplication:', error)
    return {
      success: false,
      message: '신청 취소 중 오류가 발생했습니다.',
    }
  }
}
