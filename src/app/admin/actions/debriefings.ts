'use server'

/**
 * 디브리핑 관리 서버 액션 (강사/관리자용)
 *
 * 이 파일은 상세 디브리핑 관련 모든 서버 액션을 포함합니다:
 * - 단일 디브리핑 저장
 * - 일괄 디브리핑 저장 (트랜잭션)
 * - 디브리핑 수정/삭제
 * - 디브리핑 조회
 */

import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

// ============================================
// 1. 단일 디브리핑 저장
// ============================================

export interface DebriefingInput {
  reservation_id: string
  performance?: string
  improvement?: string
  strengths?: string
  next_goal?: string
}

/**
 * 강사/관리자가 단일 디브리핑 저장
 */
export async function saveDebriefing(
  input: DebriefingInput
): Promise<{ success: boolean; message: string; debriefingId?: number }> {
  const supabase = await createClient()

  try {
    // 1. 강사/관리자 권한 확인
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

    if (!profile || !['instructor', 'admin'].includes(profile.role)) {
      return { success: false, message: '강사 또는 관리자 권한이 필요합니다.' }
    }

    // 2. 예약 상태 확인 (출석 완료된 예약만 디브리핑 가능)
    const { data: reservation } = await supabase
      .from('reservations')
      .select('id, status')
      .eq('id', input.reservation_id)
      .single()

    if (!reservation) {
      return { success: false, message: '예약 정보를 찾을 수 없습니다.' }
    }

    if (reservation.status !== 'attended') {
      return {
        success: false,
        message: '출석 완료된 예약만 디브리핑을 작성할 수 있습니다.',
      }
    }

    // 3. 기존 디브리핑 확인 (있으면 업데이트, 없으면 생성)
    const { data: existing } = await supabase
      .from('debriefings')
      .select('id')
      .eq('reservation_id', input.reservation_id)
      .maybeSingle()

    let debriefingId: number

    if (existing) {
      // 업데이트
      const { data: updated, error: updateError } = await supabase
        .from('debriefings')
        .update({
          instructor_id: user.id,
          performance: input.performance || null,
          improvement: input.improvement || null,
          strengths: input.strengths || null,
          next_goal: input.next_goal || null,
        })
        .eq('id', existing.id)
        .select('id')
        .single()

      if (updateError || !updated) {
        console.error('Error updating debriefing:', updateError)
        return { success: false, message: '디브리핑 수정에 실패했습니다.' }
      }

      debriefingId = updated.id
    } else {
      // 생성
      const { data: created, error: createError } = await supabase
        .from('debriefings')
        .insert({
          reservation_id: input.reservation_id,
          instructor_id: user.id,
          performance: input.performance || null,
          improvement: input.improvement || null,
          strengths: input.strengths || null,
          next_goal: input.next_goal || null,
        })
        .select('id')
        .single()

      if (createError || !created) {
        console.error('Error creating debriefing:', createError)
        return { success: false, message: '디브리핑 저장에 실패했습니다.' }
      }

      debriefingId = created.id
    }

    revalidatePath('/admin/classes')
    revalidatePath('/dashboard')

    return {
      success: true,
      message: '디브리핑이 저장되었습니다.',
      debriefingId,
    }
  } catch (error) {
    console.error('Error in saveDebriefing:', error)
    return {
      success: false,
      message: '디브리핑 저장 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 2. 일괄 디브리핑 저장 (트랜잭션)
// ============================================

export interface BulkDebriefingInput {
  reservation_id: string
  performance?: string
  improvement?: string
  strengths?: string
  next_goal?: string
  // 출석 처리도 함께 할 경우
  mark_attended?: boolean
}

export interface BulkDebriefingResult {
  success: boolean
  message: string
  successCount: number
  failedCount: number
  errors: Array<{
    reservation_id: string
    error: string
  }>
}

/**
 * 강사/관리자가 일괄 디브리핑 저장 (트랜잭션 처리)
 * - 여러 학생의 디브리핑을 한 번에 저장
 * - 출석 처리와 함께 수행 가능
 */
export async function saveDebriefingBulk(
  inputs: BulkDebriefingInput[]
): Promise<BulkDebriefingResult> {
  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

  try {
    // 1. 강사/관리자 권한 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        message: '로그인이 필요합니다.',
        successCount: 0,
        failedCount: inputs.length,
        errors: inputs.map((input) => ({
          reservation_id: input.reservation_id,
          error: '로그인이 필요합니다.',
        })),
      }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['instructor', 'admin'].includes(profile.role)) {
      return {
        success: false,
        message: '강사 또는 관리자 권한이 필요합니다.',
        successCount: 0,
        failedCount: inputs.length,
        errors: inputs.map((input) => ({
          reservation_id: input.reservation_id,
          error: '권한이 없습니다.',
        })),
      }
    }

    // 2. 각 디브리핑 저장 (개별 트랜잭션)
    let successCount = 0
    let failedCount = 0
    const errors: Array<{ reservation_id: string; error: string }> = []

    for (const input of inputs) {
      try {
        // 2-1. 출석 처리/취소
        if (input.mark_attended !== undefined) {
          const { data: reservation } = await supabaseAdmin
            .from('reservations')
            .select('status')
            .eq('id', input.reservation_id)
            .single()

          if (reservation) {
            if (input.mark_attended && reservation.status === 'confirmed') {
              await supabaseAdmin
                .from('reservations')
                .update({ status: 'attended' })
                .eq('id', input.reservation_id)
            } else if (!input.mark_attended && reservation.status === 'attended') {
              await supabaseAdmin
                .from('reservations')
                .update({ status: 'confirmed' })
                .eq('id', input.reservation_id)
            }
          }
        }

        // 2-2. 디브리핑 저장/업데이트
        const { data: existing } = await supabaseAdmin
          .from('debriefings')
          .select('id')
          .eq('reservation_id', input.reservation_id)
          .maybeSingle()

        if (existing) {
          // 업데이트
          const { error: updateError } = await supabaseAdmin
            .from('debriefings')
            .update({
              instructor_id: user.id,
              performance: input.performance || null,
              improvement: input.improvement || null,
              strengths: input.strengths || null,
              next_goal: input.next_goal || null,
            })
            .eq('id', existing.id)

          if (updateError) {
            throw updateError
          }
        } else {
          // 생성
          const { error: createError } = await supabaseAdmin
            .from('debriefings')
            .insert({
              reservation_id: input.reservation_id,
              instructor_id: user.id,
              performance: input.performance || null,
              improvement: input.improvement || null,
              strengths: input.strengths || null,
              next_goal: input.next_goal || null,
            })

          if (createError) {
            throw createError
          }
        }

        successCount++
      } catch (error: any) {
        failedCount++
        errors.push({
          reservation_id: input.reservation_id,
          error: error.message || '알 수 없는 오류',
        })
        console.error(
          `Error saving debriefing for reservation ${input.reservation_id}:`,
          error
        )
      }
    }

    revalidatePath('/admin/classes')
    revalidatePath('/dashboard')

    const allSuccess = failedCount === 0
    const message = allSuccess
      ? `${successCount}건의 디브리핑이 저장되었습니다.`
      : `${successCount}건 성공, ${failedCount}건 실패`

    return {
      success: allSuccess,
      message,
      successCount,
      failedCount,
      errors,
    }
  } catch (error) {
    console.error('Error in saveDebriefingBulk:', error)
    return {
      success: false,
      message: '일괄 디브리핑 저장 중 오류가 발생했습니다.',
      successCount: 0,
      failedCount: inputs.length,
      errors: inputs.map((input) => ({
        reservation_id: input.reservation_id,
        error: '서버 오류',
      })),
    }
  }
}

// ============================================
// 3. 디브리핑 삭제
// ============================================

/**
 * 강사/관리자가 디브리핑 삭제
 */
export async function deleteDebriefing(
  debriefingId: number
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()

  try {
    // 1. 강사/관리자 권한 확인
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

    if (!profile || !['instructor', 'admin'].includes(profile.role)) {
      return { success: false, message: '강사 또는 관리자 권한이 필요합니다.' }
    }

    // 2. 디브리핑 삭제
    const { error } = await supabase
      .from('debriefings')
      .delete()
      .eq('id', debriefingId)

    if (error) {
      console.error('Error deleting debriefing:', error)
      return { success: false, message: '디브리핑 삭제에 실패했습니다.' }
    }

    revalidatePath('/admin/classes')
    revalidatePath('/dashboard')

    return { success: true, message: '디브리핑이 삭제되었습니다.' }
  } catch (error) {
    console.error('Error in deleteDebriefing:', error)
    return {
      success: false,
      message: '디브리핑 삭제 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 4. 디브리핑 조회 (관리자용)
// ============================================

/**
 * 특정 수업의 모든 디브리핑 조회
 */
export async function getDebriefingsByClass(classId: string) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('debriefings')
    .select(
      `
      *,
      reservation:reservations!inner(
        user_id,
        class_id,
        profiles:user_id(name, email)
      ),
      instructor:profiles!debriefings_instructor_id_fkey(name)
    `
    )
    .eq('reservation.class_id', classId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching debriefings by class:', error)
    return []
  }

  return data || []
}

/**
 * 특정 학생의 모든 디브리핑 조회
 */
export async function getDebriefingsByStudent(userId: string) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('debriefings')
    .select(
      `
      *,
      reservation:reservations!inner(
        class_id,
        user_id,
        classes(date, time, type, location)
      ),
      instructor:profiles!debriefings_instructor_id_fkey(name)
    `
    )
    .eq('reservation.user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching debriefings by student:', error)
    return []
  }

  return data || []
}

// ============================================
// 5. 수업 앨범(미디어 링크) 저장
// ============================================

/**
 * 특정 수업의 사진 앨범(미디어 링크) 업데이트
 */
export async function updateClassMediaLink(
  classId: string,
  mediaLink: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createClient()
    const supabaseAdmin = getSupabaseAdmin()

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

    if (!profile || !['instructor', 'admin'].includes(profile.role)) {
      return { success: false, message: '권한이 없습니다.' }
    }

    const { error } = await supabaseAdmin
      .from('classes')
      .update({ media_link: mediaLink || null })
      .eq('id', classId)

    if (error) {
      console.error('Error updating media link:', error)
      return { success: false, message: '미디어 링크 저장에 실패했습니다.' }
    }

    revalidatePath('/admin/debriefings')
    revalidatePath('/admin/classes')
    
    return { success: true, message: '사진 앨범 링크가 저장되었습니다.' }
  } catch (error) {
    console.error('Error in updateClassMediaLink:', error)
    return { success: false, message: '오류가 발생했습니다.' }
  }
}
