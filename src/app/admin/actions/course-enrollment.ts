'use server'

/**
 * 과정 등록 신청 관리 서버 액션 (관리자용)
 *
 * 이 파일은 관리자가 과정 신청을 승인/거부하는 워크플로우를 포함합니다:
 * - approveCourseRequest: 신청 승인 및 크레딧 지급
 * - rejectCourseRequest: 신청 거부
 * - assignCourseToUser: 사용자에게 과정 직접 배정
 * - getPendingCourseRequests: pending 신청 조회
 */

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// 1. 과정 신청 승인 (크레딧 자동 지급)
// ============================================

export interface ApproveCourseRequestInput {
  progressId: number
  adminNotes?: string
  customCreditAmount?: number  // 관리자가 직접 지정하는 크레딧 금액 (없으면 과정 기본 금액 사용)
}

/**
 * 관리자가 과정 신청 승인
 * - status: pending → in_progress
 * - 크레딧 지급 (courses.price.standard에서 추출)
 * - approved_by, approved_at 기록
 * - 실패 시 자동 롤백
 */
export async function approveCourseRequest(
  input: ApproveCourseRequestInput
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()

  try {
    // 1. 관리자 권한 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: '로그인이 필요합니다.' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return { success: false, message: '관리자 권한이 필요합니다.' }
    }

    // 2. course_progress + courses 조인 조회
    const { data: progressWithCourse } = await supabase
      .from('course_progress')
      .select(`
        id,
        user_id,
        course_id,
        course_level,
        status,
        courses(id, title, level, price)
      `)
      .eq('id', input.progressId)
      .single()

    if (!progressWithCourse) {
      return { success: false, message: '신청 정보를 찾을 수 없습니다.' }
    }

    // 3. status='pending' 검증
    if (progressWithCourse.status !== 'pending') {
      return {
        success: false,
        message: '대기 중인 신청만 승인할 수 있습니다.',
      }
    }

    // 4. 크레딧 금액 추출 (courses.price.standard)
    const course = (progressWithCourse.courses as any)
    const courseTitle = course?.title || progressWithCourse.course_level
    const priceObj = course?.price || {}
    const defaultCreditAmount = priceObj.standard || priceObj.credits || 0
    // 관리자가 직접 지정한 크레딧 금액이 있으면 우선 사용
    const creditAmount = input.customCreditAmount ?? defaultCreditAmount

    if (!creditAmount || creditAmount <= 0) {
      return {
        success: false,
        message: '과정의 크레딧 정보가 설정되지 않았습니다.',
      }
    }

    // 5. course_progress 업데이트 (상태 변경 + 승인 기록)
    const { error: updateError } = await supabase
      .from('course_progress')
      .update({
        status: 'in_progress',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        credits_granted: creditAmount,
        credit_grant_reason: 'course_enrollment',
      })
      .eq('id', input.progressId)

    if (updateError) {
      console.error('Error updating course progress:', updateError)
      return { success: false, message: `신청 처리 실패: ${updateError.message} (${updateError.code})` }
    }

    // 6. 크레딧 지급 (RPC 호출)
    // ⚠️ p_related_entity_id는 UUID 타입이지만 progressId는 숫자(BIGINT)이므로 null 전달
    //    대신 메모에 progressId를 포함시켜 추적 가능하게 함
    const { data: creditResult, error: creditError } = await supabase.rpc(
      'add_credits',
      {
        p_user_id: progressWithCourse.user_id,
        p_amount: creditAmount,
        p_reason: 'course_enrollment',
        p_related_entity_id: null,
        p_related_entity_type: 'course_progress',
        p_memo: `${courseTitle} 과정 등록 승인 - ${creditAmount}C 지급 (progress_id: ${input.progressId})`,
      }
    )

    // 7. 실패 시 롤백 (status를 다시 pending으로)
    if (creditError || !creditResult?.success) {
      console.error('Error granting credits:', creditError)

      // 롤백: course_progress를 pending으로 되돌리기
      await supabase
        .from('course_progress')
        .update({
          status: 'pending',
          approved_by: null,
          approved_at: null,
          started_at: null,
          credits_granted: 0,
        })
        .eq('id', input.progressId)

      return {
        success: false,
        message: `크레딧 지급 실패: ${creditError?.message || '알 수 없는 오류'}`,
      }
    }

    // 8. revalidatePath
    revalidatePath('/admin')
    revalidatePath('/dashboard')

    return {
      success: true,
      message: `과정이 승인되었습니다. (${creditAmount}C 지급)`,
    }
  } catch (error: any) {
    console.error('Error in approveCourseRequest:', error)
    return {
      success: false,
      message: `시스템 오류: ${error?.message || JSON.stringify(error)}`,
    }
  }
}

// ============================================
// 2. 과정 신청 거부
// ============================================

export interface RejectCourseRequestInput {
  progressId: number
  reason?: string
}

/**
 * 관리자가 과정 신청 거부
 * - status: pending → dropped
 * - notes에 거부 사유 기록
 */
export async function rejectCourseRequest(
  input: RejectCourseRequestInput
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()

  try {
    // 1. 관리자 권한 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: '로그인이 필요합니다.' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return { success: false, message: '관리자 권한이 필요합니다.' }
    }

    // 2. 신청 조회
    const { data: progress } = await supabase
      .from('course_progress')
      .select('id, status')
      .eq('id', input.progressId)
      .single()

    if (!progress) {
      return { success: false, message: '신청 정보를 찾을 수 없습니다.' }
    }

    if (progress.status !== 'pending') {
      return {
        success: false,
        message: '대기 중인 신청만 거부할 수 있습니다.',
      }
    }

    // 3. 신청 거부 처리
    const { error: updateError } = await supabase
      .from('course_progress')
      .update({
        status: 'dropped',
        notes: input.reason || '관리자에 의해 거부됨',
      })
      .eq('id', input.progressId)

    if (updateError) {
      console.error('Error rejecting course request:', updateError)
      return { success: false, message: `거부 처리 실패: ${updateError.message}` }
    }

    // 4. revalidatePath
    revalidatePath('/admin')
    revalidatePath('/dashboard')

    return {
      success: true,
      message: '신청이 거부되었습니다.',
    }
  } catch (error: any) {
    console.error('Error in rejectCourseRequest:', error)
    return {
      success: false,
      message: `시스템 오류: ${error?.message || JSON.stringify(error)}`,
    }
  }
}

// ============================================
// 3. 사용자에게 과정 직접 배정 (신청 없이)
// ============================================

export interface AssignCourseInput {
  userId: string
  courseId: string
}

/**
 * 관리자가 사용자에게 과정을 직접 배정
 * - 신청 절차 없이 바로 in_progress로 생성
 * - 크레딧 자동 지급
 * - 승인 메타데이터 기록
 */
export async function assignCourseToUser(
  input: AssignCourseInput
): Promise<{ success: boolean; message: string; progressId?: number }> {
  const supabase = await createClient()

  try {
    // 1. 관리자 권한 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: '로그인이 필요합니다.' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return { success: false, message: '관리자 권한이 필요합니다.' }
    }

    // 2. 과정 정보 조회
    const { data: course } = await supabase
      .from('courses')
      .select('id, title, level, price, status')
      .eq('id', input.courseId)
      .single()

    if (!course) {
      return { success: false, message: '과정 정보를 찾을 수 없습니다.' }
    }

    if (course.status !== 'ACTIVE') {
      return {
        success: false,
        message: '활성 과정만 배정할 수 있습니다.',
      }
    }

    // 3. 사용자 확인
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', input.userId)
      .single()

    if (!targetUser) {
      return { success: false, message: '사용자를 찾을 수 없습니다.' }
    }

    // 4. 크레딧 금액 추출
    const courseLevel = course.level || input.courseId
    const priceObj = course.price || {}
    const creditAmount = priceObj.standard || priceObj.credits || 0

    if (!creditAmount || creditAmount <= 0) {
      return {
        success: false,
        message: '과정의 크레딧 정보가 설정되지 않았습니다.',
      }
    }

    // 5. 중복 확인 (동일 course_level의 pending/in_progress)
    const { data: existing } = await supabase
      .from('course_progress')
      .select('id, status')
      .eq('user_id', input.userId)
      .eq('course_level', courseLevel)
      .in('status', ['pending', 'in_progress'])
      .maybeSingle()

    if (existing) {
      return {
        success: false,
        message: '이미 신청했거나 진행 중인 과정입니다.',
      }
    }

    // 6. course_progress 생성 (in_progress로 직접 배정)
    const now = new Date().toISOString()
    const { data: progressData, error: insertError } = await supabase
      .from('course_progress')
      .insert({
        user_id: input.userId,
        course_id: input.courseId,
        course_level: courseLevel,
        status: 'in_progress',
        applied_at: now,
        started_at: now,
        approved_by: user.id,
        approved_at: now,
        credits_granted: creditAmount,
        credit_grant_reason: 'course_enrollment',
      })
      .select('id')
      .single()

    if (insertError || !progressData) {
      console.error('Error creating course assignment:', insertError)
      return { success: false, message: '과정 배정 생성에 실패했습니다.' }
    }

    // 7. 크레딧 지급
    // ⚠️ p_related_entity_id는 UUID 타입이지만 progressId는 숫자(BIGINT)이므로 null 전달
    const { data: creditResult, error: creditError } = await supabase.rpc(
      'add_credits',
      {
        p_user_id: input.userId,
        p_amount: creditAmount,
        p_reason: 'course_enrollment',
        p_related_entity_id: null,
        p_related_entity_type: 'course_progress',
        p_memo: `${course.title} 과정 배정 - ${creditAmount}C 지급 (progress_id: ${progressData.id})`,
      }
    )

    // 8. 크레딧 지급 실패 시 롤백
    if (creditError || !creditResult?.success) {
      console.error('Error granting credits:', creditError)

      // 롤백: 생성한 course_progress 삭제
      await supabase
        .from('course_progress')
        .delete()
        .eq('id', progressData.id)

      return {
        success: false,
        message: '크레딧 지급 중 오류가 발생했습니다. 배정이 롤백되었습니다.',
      }
    }

    // 9. revalidatePath
    revalidatePath('/admin')
    revalidatePath('/dashboard')

    return {
      success: true,
      message: `과정이 배정되었습니다. (${creditAmount}C 지급)`,
      progressId: progressData.id,
    }
  } catch (error) {
    console.error('Error in assignCourseToUser:', error)
    return {
      success: false,
      message: '과정 배정 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 4. pending 신청 조회 (관리자)
// ============================================

export interface PendingCourseRequest {
  id: number
  user_id: string
  course_id: string | null
  course_level: string
  status: 'pending' | 'in_progress' | 'completed' | 'dropped'
  applied_at: string | null
  created_at: string
  // 조인된 데이터
  profiles?: {
    id: string
    name: string
    email: string
  }
  // 과정 & 크레딧 정보
  courseTitle?: string
  creditAmount?: number
}

/**
 * 관리자가 pending 상태의 신청 조회
 * - profiles 테이블 JOIN
 * - courses 테이블 JOIN (course_id FK 사용)
 * - 크레딧 금액도 함께 반환
 */
export async function getPendingCourseRequests(): Promise<PendingCourseRequest[]> {
  const supabase = await createClient()

  try {
    // 1. 관리자 권한 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn('No user logged in for getPendingCourseRequests')
      return []
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      console.warn('User is not admin for getPendingCourseRequests')
      return []
    }

    // 2. pending 신청 조회 (courses 조인으로 크레딧 정보도 함께 가져옴)
    const { data, error } = await supabase
      .from('course_progress')
      .select(`
        id,
        user_id,
        course_id,
        course_level,
        status,
        applied_at,
        created_at,
        profiles!course_progress_user_id_fkey(id, name, email),
        courses(id, title, level, price)
      `)
      .eq('status', 'pending')
      .order('applied_at', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('Error fetching pending course requests:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
      })
      return []
    }

    // 3. 데이터 변환 (조인된 courses에서 크레딧 금액 추출)
    const transformedData = (data || []).map((item: any) => {
      const profiles = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
      const course = Array.isArray(item.courses) ? item.courses[0] : item.courses
      const priceObj = course?.price || {}
      const creditAmount = priceObj.standard || priceObj.credits || 0

      return {
        ...item,
        profiles,
        courseTitle: course?.title || item.course_level,
        creditAmount,
      }
    })

    return transformedData as PendingCourseRequest[]
  } catch (error) {
    console.error('Error in getPendingCourseRequests:', error)
    return []
  }
}
