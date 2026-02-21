'use server'

/**
 * 스킬 체크 관리 서버 액션 (강사/관리자용)
 *
 * 이 파일은 스킬 완료 체크 관련 모든 서버 액션을 포함합니다:
 * - 스킬 완료 처리
 * - 스킬 완료 취소
 * - 학생 스킬 현황 조회
 * - 일괄 스킬 처리
 */

import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

/** Supabase 에러를 읽기 쉬운 문자열로 변환 */
function formatError(error: unknown): string {
  if (!error) return 'Unknown error'
  if (typeof error === 'string') return error
  const e = error as any
  return JSON.stringify({
    message: e.message,
    code: e.code,
    details: e.details,
    hint: e.hint,
  })
}

// ============================================
// 1. 스킬 완료 처리
// ============================================

export interface CompleteSkillInput {
  user_id: string
  course_level: string
  skill_type: 'static' | 'dynamic' | 'depth' | 'rescue' | 'theory'
  notes?: string
}

/**
 * 강사/관리자가 학생의 스킬을 완료 처리
 */
export async function completeSkill(
  input: CompleteSkillInput
): Promise<{ success: boolean; message: string; skillId?: number }> {
  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

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

    // 2. 기존 스킬 완료 기록 확인 (Admin client로 RLS 우회)
    const { data: existing, error: findError } = await supabaseAdmin
      .from('skill_completions')
      .select('id, is_completed')
      .eq('user_id', input.user_id)
      .eq('course_level', input.course_level)
      .eq('skill_type', input.skill_type)
      .maybeSingle()

    if (findError) {
      console.error('Error finding skill:', formatError(findError))
      return { success: false, message: `스킬 조회 실패: ${findError.message}` }
    }

    let skillId: number

    if (existing) {
      // 업데이트 (이미 완료된 경우 메시지 반환)
      if (existing.is_completed) {
        return {
          success: false,
          message: '이미 완료 처리된 스킬입니다.',
        }
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('skill_completions')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          notes: input.notes || null,
        })
        .eq('id', existing.id)
        .select('id')
        .single()

      if (updateError || !updated) {
        console.error('Error updating skill completion:', formatError(updateError))
        return { success: false, message: `스킬 완료 처리 실패: ${updateError?.message || '알 수 없는 오류'}` }
      }

      skillId = updated.id
    } else {
      // 생성
      const { data: created, error: createError } = await supabaseAdmin
        .from('skill_completions')
        .insert({
          user_id: input.user_id,
          course_level: input.course_level,
          skill_type: input.skill_type,
          is_completed: true,
          completed_at: new Date().toISOString(),
          completed_by: user.id,
          notes: input.notes || null,
        })
        .select('id')
        .single()

      if (createError || !created) {
        console.error('Error creating skill completion:', formatError(createError))
        return { success: false, message: `스킬 생성 실패: ${createError?.message || '알 수 없는 오류'}` }
      }

      skillId = created.id
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard')

    return {
      success: true,
      message: `${input.skill_type} 스킬이 완료 처리되었습니다.`,
      skillId,
    }
  } catch (error) {
    console.error('Error in completeSkill:', formatError(error))
    return {
      success: false,
      message: '스킬 완료 처리 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 2. 스킬 완료 취소
// ============================================

/**
 * 강사/관리자가 학생의 스킬 완료를 취소
 */
export async function uncompleteSkill(
  skillId: number
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

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

    console.log('uncompleteSkill called with skillId:', skillId, 'type:', typeof skillId)

    // 2. 스킬 완료 취소 (Admin client로 RLS 우회)
    const { data, error, count } = await supabaseAdmin
      .from('skill_completions')
      .update({
        is_completed: false,
        completed_at: null,
        completed_by: null,
      })
      .eq('id', skillId)
      .select()

    console.log('uncompleteSkill result - data:', JSON.stringify(data), 'error:', formatError(error), 'count:', count)

    if (error) {
      console.error('Error uncompleting skill:', formatError(error))
      return { success: false, message: `스킬 완료 취소 실패: ${error.message}` }
    }

    if (!data || data.length === 0) {
      console.error('No rows updated for skillId:', skillId)
      return { success: false, message: '해당 스킬을 찾을 수 없습니다.' }
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard')

    return { success: true, message: '스킬 완료가 취소되었습니다.' }
  } catch (error) {
    console.error('Error in uncompleteSkill:', formatError(error))
    return {
      success: false,
      message: `스킬 완료 취소 중 오류: ${formatError(error)}`,
    }
  }
}

// ============================================
// 3. 일괄 스킬 처리
// ============================================

export interface BulkSkillInput {
  user_id: string
  course_level: string
  skill_type: 'static' | 'dynamic' | 'depth' | 'rescue' | 'theory'
  is_completed: boolean
  notes?: string
}

export interface BulkSkillResult {
  success: boolean
  message: string
  successCount: number
  failedCount: number
  errors: Array<{
    user_id: string
    skill_type: string
    error: string
  }>
}

/**
 * 강사/관리자가 일괄 스킬 완료 처리
 */
export async function updateSkillsBulk(
  inputs: BulkSkillInput[]
): Promise<BulkSkillResult> {
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
          user_id: input.user_id,
          skill_type: input.skill_type,
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
          user_id: input.user_id,
          skill_type: input.skill_type,
          error: '권한이 없습니다.',
        })),
      }
    }

    // 2. 각 스킬 업데이트
    let successCount = 0
    let failedCount = 0
    const errors: Array<{
      user_id: string
      skill_type: string
      error: string
    }> = []

    for (const input of inputs) {
      try {
        // 기존 레코드 확인
        const { data: existing } = await supabaseAdmin
          .from('skill_completions')
          .select('id')
          .eq('user_id', input.user_id)
          .eq('course_level', input.course_level)
          .eq('skill_type', input.skill_type)
          .maybeSingle()

        if (existing) {
          // 업데이트
          const { error: updateError } = await supabaseAdmin
            .from('skill_completions')
            .update({
              is_completed: input.is_completed,
              completed_at: input.is_completed
                ? new Date().toISOString()
                : null,
              completed_by: input.is_completed ? user.id : null,
              notes: input.notes || null,
            })
            .eq('id', existing.id)

          if (updateError) {
            throw updateError
          }
        } else if (input.is_completed) {
          // 완료 처리인 경우만 생성 (미완료 상태는 레코드 없어도 됨)
          const { error: createError } = await supabaseAdmin
            .from('skill_completions')
            .insert({
              user_id: input.user_id,
              course_level: input.course_level,
              skill_type: input.skill_type,
              is_completed: true,
              completed_at: new Date().toISOString(),
              completed_by: user.id,
              notes: input.notes || null,
            })

          if (createError) {
            throw createError
          }
        }

        successCount++
      } catch (error: any) {
        failedCount++
        errors.push({
          user_id: input.user_id,
          skill_type: input.skill_type,
          error: error.message || '알 수 없는 오류',
        })
        console.error(
          `Error updating skill for user ${input.user_id}, skill ${input.skill_type}:`,
          formatError(error)
        )
      }
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard')

    const allSuccess = failedCount === 0
    const message = allSuccess
      ? `${successCount}건의 스킬이 처리되었습니다.`
      : `${successCount}건 성공, ${failedCount}건 실패`

    return {
      success: allSuccess,
      message,
      successCount,
      failedCount,
      errors,
    }
  } catch (error) {
    console.error('Error in updateSkillsBulk:', formatError(error))
    return {
      success: false,
      message: '일괄 스킬 처리 중 오류가 발생했습니다.',
      successCount: 0,
      failedCount: inputs.length,
      errors: inputs.map((input) => ({
        user_id: input.user_id,
        skill_type: input.skill_type,
        error: '서버 오류',
      })),
    }
  }
}

// ============================================
// 4. 학생 스킬 현황 조회 (관리자용)
// ============================================

/**
 * 특정 학생의 스킬 현황 조회
 */
export async function getStudentSkills(userId: string) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('skill_completions')
    .select(
      `
      *,
      completed_by_profile:profiles!skill_completions_completed_by_fkey(name)
    `
    )
    .eq('user_id', userId)
    .order('course_level', { ascending: true })
    .order('skill_type', { ascending: true })

  if (error) {
    console.error('Error fetching student skills:', formatError(error))
    return []
  }

  return data || []
}

/**
 * 특정 코스 레벨의 모든 학생 스킬 현황 조회
 */
export async function getSkillsByCourseLevel(courseLevel: string) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('skill_completions')
    .select(
      `
      *,
      user:profiles!skill_completions_user_id_fkey(id, name, email),
      completed_by_profile:profiles!skill_completions_completed_by_fkey(name)
    `
    )
    .eq('course_level', courseLevel)
    .order('user_id', { ascending: true })
    .order('skill_type', { ascending: true })

  if (error) {
    console.error('Error fetching skills by course level:', formatError(error))
    return []
  }

  return data || []
}

// ============================================
// 5. 코스 진도 관리 (관리자용)
// ============================================

export interface CourseProgressInput {
  user_id: string
  course_level: string
  status: 'in_progress' | 'completed' | 'dropped'
  theory_completed?: boolean
  pool_sessions_completed?: number
  notes?: string
}

/**
 * 강사/관리자가 학생의 코스 진도 업데이트
 */
export async function updateCourseProgress(
  input: CourseProgressInput
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

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

    console.log('updateCourseProgress called with input:', JSON.stringify(input))

    // 2. 기존 진도 확인 (Admin client로 RLS 우회)
    const { data: existing, error: findError } = await supabaseAdmin
      .from('course_progress')
      .select('id, status')
      .eq('user_id', input.user_id)
      .eq('course_level', input.course_level)
      .maybeSingle()

    if (findError) {
      console.error('Error finding course progress:', formatError(findError))
      return { success: false, message: `진도 조회 실패: ${findError.message}` }
    }

    console.log('Existing progress:', JSON.stringify(existing))

    const updateData: Record<string, any> = {
      status: input.status,
    }

    if (input.theory_completed !== undefined) {
      updateData.theory_completed = input.theory_completed
    }

    if (input.pool_sessions_completed !== undefined) {
      updateData.pool_sessions_completed = input.pool_sessions_completed
    }

    if (input.notes !== undefined) {
      updateData.notes = input.notes
    }

    // 완료 상태로 변경 시 완료 시간 기록
    if (input.status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    if (existing) {
      // 업데이트
      const { data: updatedData, error: updateError } = await supabaseAdmin
        .from('course_progress')
        .update(updateData)
        .eq('id', existing.id)
        .select()

      console.log('Update result - data:', JSON.stringify(updatedData), 'error:', formatError(updateError))

      if (updateError) {
        console.error('Error updating course progress:', formatError(updateError))
        return { success: false, message: `진도 업데이트 실패: ${updateError.message}` }
      }
    } else {
      // 생성
      const { data: createdData, error: createError } = await supabaseAdmin
        .from('course_progress')
        .insert({
          user_id: input.user_id,
          course_level: input.course_level,
          ...updateData,
        })
        .select()

      console.log('Insert result - data:', JSON.stringify(createdData), 'error:', formatError(createError))

      if (createError) {
        console.error('Error creating course progress:', formatError(createError))
        return { success: false, message: `진도 생성 실패: ${createError.message}` }
      }
    }

    revalidatePath('/admin')
    revalidatePath('/dashboard')

    return { success: true, message: '진도가 업데이트되었습니다.' }
  } catch (error) {
    console.error('Error in updateCourseProgress:', formatError(error))
    return {
      success: false,
      message: `진도 업데이트 중 오류: ${formatError(error)}`,
    }
  }
}

/**
 * 특정 학생의 코스 진도 조회
 */
export async function getStudentCourseProgress(userId: string) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('course_progress')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })

  if (error) {
    console.error('Error fetching student course progress:', formatError(error))
    return []
  }

  return data || []
}
