'use server'

/**
 * 정기 트레이닝 출석 및 보너스 시스템 서버 액션
 * 
 * 이 파일은 정기 트레이닝 출석 관련 모든 서버 액션을 포함합니다:
 * - 출석 체크
 * - 보너스 크레딧 지급
 * - 출석 내역 조회
 * - 월별 보너스 한도 체크
 */

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AttendanceLog } from '@/types/credit'
import { REGULAR_TRAINING_BONUS } from '@/lib/credit-constants'

// ============================================
// 1. 출석 체크 및 보너스 지급
// ============================================

/**
 * 정기 트레이닝 출석 체크 및 보너스 크레딧 지급
 * - 같은 날 중복 출석 방지
 * - 월별 보너스 한도 체크
 */
export async function recordAttendance(
  userId: string,
  attendanceDate: string, // YYYY-MM-DD 형식
  adminMemo?: string
): Promise<{ success: boolean; message: string; bonusGranted?: number }> {
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

    if (profile?.role !== 'admin') {
      return { success: false, message: '관리자 권한이 필요합니다.' }
    }

    // 2. 중복 출석 체크
    const { data: existingAttendance } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('attendance_date', attendanceDate)
      .single()

    if (existingAttendance) {
      return {
        success: false,
        message: '이미 해당 날짜에 출석 기록이 있습니다.',
      }
    }

    // 3. 월별 보너스 한도 체크
    const currentMonth = attendanceDate.substring(0, 7) // YYYY-MM
    const { data: monthlyAttendances } = await supabase
      .from('attendance_logs')
      .select('bonus_amount')
      .eq('user_id', userId)
      .gte('attendance_date', `${currentMonth}-01`)
      .lte('attendance_date', `${currentMonth}-31`)

    const monthlyBonusTotal =
      monthlyAttendances?.reduce((sum, log) => sum + log.bonus_amount, 0) || 0

    // 4. 보너스 지급 여부 결정
    let bonusAmount = 0
    let bonusCredited = false

    if (monthlyBonusTotal < REGULAR_TRAINING_BONUS.MONTHLY_MAX) {
      const remainingBonus =
        REGULAR_TRAINING_BONUS.MONTHLY_MAX - monthlyBonusTotal
      bonusAmount = Math.min(
        REGULAR_TRAINING_BONUS.PER_ATTENDANCE,
        remainingBonus
      )
      bonusCredited = true

      // 보너스 크레딧 지급
      const { error: bonusError } = await supabase.rpc('add_credits', {
        p_user_id: userId,
        p_amount: bonusAmount,
        p_reason: 'regular_training_attendance_bonus',
        p_memo: `정기 트레이닝 출석 보너스 (${attendanceDate}, ${bonusAmount}C 지급)`,
      })

      if (bonusError) {
        console.error('Error granting bonus credits:', bonusError)
        return {
          success: false,
          message: '보너스 크레딧 지급에 실패했습니다.',
        }
      }
    }

    // 5. 출석 기록
    const { error: attendanceError } = await supabase
      .from('attendance_logs')
      .insert({
        user_id: userId,
        attendance_date: attendanceDate,
        training_type: 'regular_training',
        bonus_credited: bonusCredited,
        bonus_amount: bonusAmount,
        admin_memo: adminMemo,
        recorded_by: user.id,
      })

    if (attendanceError) {
      console.error('Error recording attendance:', attendanceError)
      
      // 출석 기록 실패 시 보너스 크레딧 환불
      if (bonusCredited && bonusAmount > 0) {
        await supabase.rpc('deduct_credits', {
          p_user_id: userId,
          p_amount: bonusAmount,
          p_reason: 'attendance_record_failed',
          p_memo: `출석 기록 실패로 인한 보너스 회수 (${bonusAmount}C)`,
        })
      }

      return {
        success: false,
        message: '출석 기록에 실패했습니다.',
      }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin/attendance')

    const message = bonusCredited
      ? `출석이 기록되었습니다. 보너스 ${bonusAmount}C가 지급되었습니다.`
      : `출석이 기록되었습니다. (이번 달 보너스 한도 도달: ${REGULAR_TRAINING_BONUS.MONTHLY_MAX}C)`

    return {
      success: true,
      message,
      bonusGranted: bonusAmount,
    }
  } catch (error) {
    console.error('Error in recordAttendance:', error)
    return {
      success: false,
      message: '출석 기록 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 2. 출석 내역 조회
// ============================================

/**
 * 사용자의 출석 내역 조회
 */
export async function getAttendanceLogs(
  userId: string,
  limit: number = 50
): Promise<AttendanceLog[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', userId)
    .order('attendance_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching attendance logs:', error)
    throw new Error('출석 내역 조회에 실패했습니다.')
  }

  return data || []
}

/**
 * 관리자용: 모든 출석 내역 조회
 */
export async function getAllAttendanceLogs(
  limit: number = 100
): Promise<AttendanceLog[]> {
  const supabase = await createClient()

  // 관리자 권한 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('관리자 권한이 필요합니다.')
  }

  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .order('attendance_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching all attendance logs:', error)
    throw new Error('출석 내역 조회에 실패했습니다.')
  }

  return data || []
}

// ============================================
// 3. 월별 보너스 통계 조회
// ============================================

/**
 * 사용자의 월별 보너스 통계 조회
 */
export async function getMonthlyBonusStats(
  userId: string,
  yearMonth: string // YYYY-MM 형식
): Promise<{
  totalBonus: number
  attendanceCount: number
  remainingBonus: number
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('attendance_logs')
    .select('bonus_amount')
    .eq('user_id', userId)
    .gte('attendance_date', `${yearMonth}-01`)
    .lte('attendance_date', `${yearMonth}-31`)

  if (error) {
    console.error('Error fetching monthly bonus stats:', error)
    throw new Error('월별 보너스 통계 조회에 실패했습니다.')
  }

  const totalBonus = data?.reduce((sum, log) => sum + log.bonus_amount, 0) || 0
  const attendanceCount = data?.length || 0
  const remainingBonus = Math.max(
    0,
    REGULAR_TRAINING_BONUS.MONTHLY_MAX - totalBonus
  )

  return {
    totalBonus,
    attendanceCount,
    remainingBonus,
  }
}

// ============================================
// 4. 출석 기록 삭제 (관리자)
// ============================================

/**
 * 관리자가 출석 기록 삭제 (보너스 회수)
 */
export async function deleteAttendanceLog(
  attendanceId: string
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

    if (profile?.role !== 'admin') {
      return { success: false, message: '관리자 권한이 필요합니다.' }
    }

    // 2. 출석 기록 조회
    const { data: attendance, error: fetchError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('id', attendanceId)
      .single()

    if (fetchError || !attendance) {
      console.error('Error fetching attendance log:', fetchError)
      return { success: false, message: '출석 기록을 찾을 수 없습니다.' }
    }

    // 3. 보너스 크레딧 회수
    if (attendance.bonus_credited && attendance.bonus_amount > 0) {
      const { error: deductError } = await supabase.rpc('deduct_credits', {
        p_user_id: attendance.user_id,
        p_amount: attendance.bonus_amount,
        p_reason: 'attendance_deleted',
        p_related_entity_id: attendanceId,
        p_related_entity_type: 'attendance_log',
        p_memo: `출석 기록 삭제로 인한 보너스 회수 (${attendance.attendance_date}, ${attendance.bonus_amount}C)`,
      })

      if (deductError) {
        console.error('Error deducting bonus credits:', deductError)
        return {
          success: false,
          message: '보너스 크레딧 회수에 실패했습니다.',
        }
      }
    }

    // 4. 출석 기록 삭제
    const { error: deleteError } = await supabase
      .from('attendance_logs')
      .delete()
      .eq('id', attendanceId)

    if (deleteError) {
      console.error('Error deleting attendance log:', deleteError)
      
      // 삭제 실패 시 보너스 크레딧 복구
      if (attendance.bonus_credited && attendance.bonus_amount > 0) {
        await supabase.rpc('add_credits', {
          p_user_id: attendance.user_id,
          p_amount: attendance.bonus_amount,
          p_reason: 'attendance_delete_failed',
          p_memo: `출석 기록 삭제 실패로 인한 보너스 복구 (${attendance.bonus_amount}C)`,
        })
      }

      return {
        success: false,
        message: '출석 기록 삭제에 실패했습니다.',
      }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin/attendance')

    return {
      success: true,
      message: `출석 기록이 삭제되었습니다.${
        attendance.bonus_credited
          ? ` (보너스 ${attendance.bonus_amount}C 회수됨)`
          : ''
      }`,
    }
  } catch (error) {
    console.error('Error in deleteAttendanceLog:', error)
    return {
      success: false,
      message: '출석 기록 삭제 중 오류가 발생했습니다.',
    }
  }
}
