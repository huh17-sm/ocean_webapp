'use server'

/**
 * 크레딧 시스템 서버 액션
 * 
 * 이 파일은 크레딧 관련 모든 서버 액션을 포함합니다:
 * - 크레딧 조회
 * - 패키지 구매
 * - 크레딧 차감/환불
 * - 거래 내역 조회
 */

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  CreditTransaction,
  CreditOperationResult,
  PackagePurchase,
  PackageType,
  RechargeRequest,
} from '@/types/credit'
import { CURRICULUM_PACKAGES } from '@/lib/credit-constants'
import { requireAdmin } from '@/app/admin/utils/auth'

// ============================================
// 1. 크레딧 잔액 조회
// ============================================

/**
 * 사용자의 현재 크레딧 잔액 조회
 */
export async function getUserCredits(userId: string): Promise<number> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('general_credits, credits')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user credits:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    // 에러 발생 시 0 반환
    return 0
  }

  return Math.max(data?.general_credits || 0, data?.credits || 0)
}

// ============================================
// 2. 패키지 구매 (크레딧 지급)
// ============================================

/**
 * 정규 커리큘럼 패키지 구매
 * - 크레딧 지급
 * - 거래 내역 기록
 * - 패키지 구매 내역 기록
 */
export async function purchasePackage(
  userId: string,
  packageType: PackageType,
  paymentMethod?: string,
  paymentId?: string,
  adminMemo?: string
): Promise<{ success: boolean; message: string; purchaseId?: string }> {
  const supabase = await createClient()

  // Validate userId format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
      console.error(`Invalid User ID format: ${userId}`);
      return { success: false, message: '유효하지 않은 사용자 ID입니다.' };
  }

  // 1. 패키지 정보 조회
  const packageInfo = CURRICULUM_PACKAGES[packageType]
  if (!packageInfo) {
    return { success: false, message: '존재하지 않는 패키지입니다.' }
  }

  try {
    // 2. 크레딧 추가 (DB 함수 호출)
    const { data: creditResult, error: creditError } = await supabase.rpc(
      'add_credits',
      {
        p_user_id: userId,
        p_amount: packageInfo.totalCredits,
        p_reason: `package_purchase_${packageType}`,
        p_memo: `${packageInfo.name} 구매 (${packageInfo.totalCredits}C 지급)`,
      }
    )

    if (creditError || !creditResult?.success) {
      console.error('Error adding credits:', creditError)
      return { success: false, message: '크레딧 지급에 실패했습니다.' }
    }

    // 3. 패키지 구매 내역 기록
    const { data: purchase, error: purchaseError } = await supabase
      .from('package_purchases')
      .insert({
        user_id: userId,
        package_type: packageType,
        price: packageInfo.price,
        credits_granted: packageInfo.totalCredits,
        payment_status: 'completed',
        payment_method: paymentMethod,
        payment_id: paymentId,
        admin_memo: adminMemo,
      })
      .select()
      .single()

    if (purchaseError) {
      console.error('Error recording package purchase:', purchaseError)
      // 크레딧은 이미 지급되었으므로 경고만 표시
      return {
        success: true,
        message: '크레딧은 지급되었으나 구매 내역 기록에 실패했습니다.',
      }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin')

    return {
      success: true,
      message: `${packageInfo.name} 구매 완료! ${packageInfo.totalCredits}C가 지급되었습니다.`,
      purchaseId: purchase.id,
    }
  } catch (error) {
    console.error('Error in purchasePackage:', error)
    return { success: false, message: '패키지 구매 중 오류가 발생했습니다.' }
  }
}

// ============================================
// 3. 크레딧 차감 (예약 시)
// ============================================

/**
 * 수업 예약 시 크레딧 차감
 */
export async function deductCreditsForReservation(
  userId: string,
  creditCost: number,
  reservationId: string,
  classType: string
): Promise<CreditOperationResult> {
  const supabase = await createClient()

  // Validate userId format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
      console.error(`Invalid User ID format: ${userId}`);
      return { success: false, error: 'invalid_userid', message: '유효하지 않은 사용자 ID입니다.' };
  }

  try {
    // DB 함수 호출 (트랜잭션 보장)
    const { data, error } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: creditCost,
      p_reason: `reservation_${classType}`,
      p_related_entity_id: reservationId,
      p_related_entity_type: 'reservation',
      p_memo: `${classType} 수업 예약 (${creditCost}C 차감)`,
    })

    if (error) {
      console.error('Error deducting credits:', error)
      return {
        success: false,
        error: 'deduction_failed',
        message: '크레딧 차감에 실패했습니다.',
      }
    }

    revalidatePath('/mypage')
    return data as CreditOperationResult
  } catch (error) {
    console.error('Error in deductCreditsForReservation:', error)
    return {
      success: false,
      error: 'unknown_error',
      message: '크레딧 차감 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 4. 크레딧 환불 (예약 취소 시)
// ============================================

/**
 * 예약 취소 시 크레딧 환불
 */
export async function refundCreditsForCancellation(
  userId: string,
  creditAmount: number,
  reservationId: string,
  classType: string,
  memoOverride?: string
): Promise<CreditOperationResult> {
  const supabase = await createClient()

  // Validate userId format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
      console.error(`Invalid User ID format: ${userId}`);
      return { success: false, error: 'invalid_userid', message: '유효하지 않은 사용자 ID입니다.' };
  }

  try {
    // DB 함수 호출 (트랜잭션 보장)
    const { data, error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: creditAmount,
      p_reason: `refund_cancellation_${classType}`,
      p_related_entity_id: reservationId,
      p_related_entity_type: 'reservation',
      p_memo: memoOverride || `${classType} 수업 취소 환불 (${creditAmount}C 반환)`,
    })

    if (error) {
      console.error('Error refunding credits:', error)
      return {
        success: false,
        error: 'refund_failed',
        message: '크레딧 환불에 실패했습니다.',
      }
    }

    // 예약 테이블에 환불 표시
    await supabase
      .from('reservations')
      .update({ credit_refunded: true })
      .eq('id', reservationId)

    revalidatePath('/mypage')
    return data as CreditOperationResult
  } catch (error) {
    console.error('Error in refundCreditsForCancellation:', error)
    return {
      success: false,
      error: 'unknown_error',
      message: '크레딧 환불 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 5. 거래 내역 조회
// ============================================

/**
 * 사용자의 크레딧 거래 내역 조회
 */
export async function getCreditTransactions(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<CreditTransaction[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*, profiles(name, email)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching credit transactions:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    // 에러 발생 시 빈 배열 반환 (페이지 크래시 방지)
    return []
  }

  return data || []
}

// ============================================
// 6. 패키지 구매 내역 조회
// ============================================

/**
 * 사용자의 패키지 구매 내역 조회
 */
export async function getPackagePurchases(
  userId: string
): Promise<PackagePurchase[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('package_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching package purchases:', error)
    throw new Error('패키지 구매 내역 조회에 실패했습니다.')
  }

  return data || []
}

// ============================================
// 7. 관리자 전용: 크레딧 수동 조정
// ============================================

/**
 * 관리자가 사용자 크레딧을 수동으로 조정
 */
export async function adjustCreditsManually(
  userId: string,
  amount: number,
  reason: string,
  memo?: string
): Promise<CreditOperationResult> {
  try {
    // 관리자 권한 확인
    const { supabase } = await requireAdmin()

    // 크레딧 조정 (v2에서는 일반 크레딧 전용 함수가 있거나, 기본 함수가 general_credits를 처리해야 함)
    // NOTE: 만약 RPC 함수가 여전히 v1 기준(credits 컬럼 사용)이라면 에러가 날 수 있습니다.
    // 여기서는 일단 DB 컬럼명이 general_credits이므로, 관련 처리를 확인합니다.
    const functionName = amount > 0 ? 'add_credits' : 'deduct_credits'
    const { data, error } = await supabase.rpc(functionName, {
      p_user_id: userId,
      p_amount: Math.abs(amount),
      p_reason: reason,
      p_memo: memo || `관리자 수동 조정 (${amount > 0 ? '+' : '-'}${Math.abs(amount)}C)`,
    })

    if (error) {
      console.error('Error adjusting credits:', error)
      return {
        success: false,
        error: 'adjustment_failed',
        message: '크레딧 조정에 실패했습니다.',
      }
    }

    revalidatePath('/mypage')
    return data as CreditOperationResult
  } catch (error) {
    console.error('Error in adjustCreditsManually:', error)
    return {
      success: false,
      error: 'unknown_error',
      message: '크레딧 조정 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 8. 충전 요청 승인/거절
// ============================================

/**
 * 충전 요청 승인 (패키지 구매 완료 처리 및 크레딧 지급)
 */
export async function approveRechargeRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  // 관리자 권한 확인
  let supabase
  try {
    const result = await requireAdmin()
    supabase = result.supabase
  } catch (error: any) {
    return { success: false, error: error.message }
  }

  // 1. 요청 정보 조회
  const { data: request, error: fetchError } = await supabase
    .from('package_purchases')
    .select('*')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) {
    return { success: false, error: '요청을 찾을 수 없습니다.' }
  }

  if (request.payment_status === 'completed') {
    return { success: false, error: '이미 처리된 요청입니다.' }
  }

  // Validate internal data integrity
  const userUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!userUuidRegex.test(request.user_id)) {
      console.error(`Invalid User ID in request: ${request.user_id}`);
      return { success: false, error: '요청의 사용자 정보가 올바르지 않습니다.' };
  }

  // 2. 크레딧 지급 (RPC)
  const { error: creditError } = await supabase.rpc('add_credits', {
    p_user_id: request.user_id,
    p_amount: request.credits_granted,
    p_reason: `package_purchase_${request.package_type}`,
    p_related_entity_id: request.id,
    p_related_entity_type: 'package_purchase',
    p_memo: `패키지 구매 승인 (${request.credits_granted}C 지급)`
  })

  if (creditError) {
    console.error('Error adding credits:', creditError)
    return { success: false, error: '크레딧 지급 중 오류가 발생했습니다.' }
  }

  // 3. 상태 업데이트
  const { error: updateError } = await supabase
    .from('package_purchases')
    .update({ 
      payment_status: 'completed',
      admin_memo: '관리자 승인 완료'
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('Error updating status:', updateError)
    return { success: false, error: '상태 업데이트 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin')
  revalidatePath('/mypage')
  return { success: true }
}

/**
 * 충전 요청 거절 (패키지 구매 취소 처리)
 */
export async function rejectRechargeRequest(requestId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  let supabase
  try {
      const result = await requireAdmin()
      supabase = result.supabase
  } catch (error: any) {
      return { success: false, error: error.message }
  }

  // 1. 상태 업데이트
  const { error: updateError } = await supabase
    .from('package_purchases')
    .update({ 
      payment_status: 'cancelled',
      admin_memo: `관리자 거절: ${reason}`
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('Error rejecting request:', updateError)
    return { success: false, error: '거절 처리 중 오류가 발생했습니다.' }
  }

  revalidatePath('/admin')
  return { success: true }
}

// ============================================
// 9. 관리자용: 대기중인 충전 요청 조회
// ============================================

export async function getPendingRechargeRequests(): Promise<RechargeRequest[]> {
  let supabase
  try {
    const result = await requireAdmin()
    supabase = result.supabase
  } catch {
    return []
  }

  const { data, error } = await supabase
    .from('package_purchases')
    .select('*, profiles(name, email)')
    .eq('payment_status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching pending recharge requests:', error)
    return []
  }

  // Debugging: Log IDs of pending requests
  if (data && data.length > 0) {
      console.log('[getPendingRechargeRequests] Found pending requests:', data.map((r: any) => ({ id: r.id, user_id: r.user_id, price: r.price })))
      const badReq = data.find((r: any) => r.id === '2' || !/^[0-9a-f]{8}-[0-9a-f]{4}/.test(r.id))
      if (badReq) {
          console.error('[getPendingRechargeRequests] CRITICAL: Found invalid ID:', badReq)
      }
  }

  return data as RechargeRequest[] || []
}

// ============================================
// 10. 관리자용: 전체 거래 내역 조회
// ============================================

export async function getAllCreditTransactions(
  limit: number = 100,
  offset: number = 0
): Promise<CreditTransaction[]> {
  let supabase
  try {
    const result = await requireAdmin()
    supabase = result.supabase
  } catch {
    return []
  }

  const { data, error } = await supabase
    .from('credit_transactions')
    .select('*, profiles(name, email)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching all credit transactions:', error)
    return []
  }

  return data as CreditTransaction[] || []
}


