'use server'

/**
 * 자격증 발급 시스템 서버 액션
 * 
 * 이 파일은 자격증 발급 관련 모든 서버 액션을 포함합니다:
 * - 자격증 발급 신청 (교육생)
 * - 자격증 직접 발급 (강사/관리자)
 * - 발급 승인/거부
 * - 발급 내역 조회
 */

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import type {
  CertificationRequest,
  CertificationType,
  CertificationStatus,
} from '@/types/credit'
import { getCertificationCreditCost } from '@/lib/credit-constants'

// ============================================
// 1. 자격증 발급 신청 (교육생)
// ============================================

/**
 * 교육생이 자격증 발급 신청
 * - 크레딧 즉시 차감
 * - 발급 불가 시 크레딧 반환
 */
export async function requestCertification(
  userId: string,
  certificationType: CertificationType
): Promise<{ success: boolean; message: string; requestId?: string }> {
  const supabase = await createClient()

  try {
    // 1. 크레딧 비용 조회
    const creditCost = getCertificationCreditCost(certificationType)

    // 2. 크레딧 차감
    const { data: deductResult, error: deductError } = await supabase.rpc(
      'deduct_credits',
      {
        p_user_id: userId,
        p_amount: creditCost,
        p_reason: `certification_request_${certificationType}`,
        p_memo: `${certificationType} 자격증 발급 신청 (${creditCost}C 차감)`,
      }
    )

    if (deductError || !deductResult?.success) {
      console.error('Error deducting credits for certification:', deductError)
      return {
        success: false,
        message:
          deductResult?.message || '크레딧이 부족하거나 차감에 실패했습니다.',
      }
    }

    // 3. 발급 신청 기록
    const { data: request, error: requestError } = await supabase
      .from('certification_requests')
      .insert({
        user_id: userId,
        certification_type: certificationType,
        credit_cost: creditCost,
        status: 'pending',
        requested_by: 'user',
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating certification request:', requestError)
      
      // 신청 기록 실패 시 크레딧 환불
      await supabase.rpc('add_credits', {
        p_user_id: userId,
        p_amount: creditCost,
        p_reason: `certification_request_failed_${certificationType}`,
        p_memo: `${certificationType} 자격증 신청 실패 환불 (${creditCost}C 반환)`,
      })

      return {
        success: false,
        message: '자격증 발급 신청에 실패했습니다. 크레딧이 환불되었습니다.',
      }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin/certifications')

    return {
      success: true,
      message: `${certificationType} 자격증 발급 신청이 완료되었습니다. 관리자 승인을 기다려주세요.`,
      requestId: request.id,
    }
  } catch (error) {
    console.error('Error in requestCertification:', error)
    return {
      success: false,
      message: '자격증 발급 신청 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 2. 자격증 직접 발급 (강사/관리자)
// ============================================

/**
 * 강사/관리자가 교육생에게 직접 자격증 발급
 * - 크레딧 즉시 차감
 * - 자동 승인 상태로 기록
 */
export async function issueCertificationDirectly(
  userId: string,
  certificationType: CertificationType,
  adminMemo?: string
): Promise<{ success: boolean; message: string; requestId?: string }> {
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

    // 2. 크레딧 비용 조회
    const creditCost = getCertificationCreditCost(certificationType)

    // 3. 크레딧 차감
    const { data: deductResult, error: deductError } = await supabase.rpc(
      'deduct_credits',
      {
        p_user_id: userId,
        p_amount: creditCost,
        p_reason: `certification_issued_${certificationType}`,
        p_memo: `${certificationType} 자격증 발급 (강사 직접 발급, ${creditCost}C 차감)`,
      }
    )

    if (deductError || !deductResult?.success) {
      console.error('Error deducting credits for certification:', deductError)
      return {
        success: false,
        message:
          deductResult?.message || '크레딧이 부족하거나 차감에 실패했습니다.',
      }
    }

    // 4. 발급 기록 (자동 승인)
    const { data: request, error: requestError } = await supabase
      .from('certification_requests')
      .insert({
        user_id: userId,
        certification_type: certificationType,
        credit_cost: creditCost,
        status: 'approved',
        requested_by: 'instructor',
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        admin_memo: adminMemo,
      })
      .select()
      .single()

    if (requestError) {
      console.error('Error creating certification record:', requestError)
      
      // 기록 실패 시 크레딧 환불
      await supabase.rpc('add_credits', {
        p_user_id: userId,
        p_amount: creditCost,
        p_reason: `certification_issue_failed_${certificationType}`,
        p_memo: `${certificationType} 자격증 발급 실패 환불 (${creditCost}C 반환)`,
      })

      return {
        success: false,
        message: '자격증 발급 기록에 실패했습니다. 크레딧이 환불되었습니다.',
      }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin/certifications')

    return {
      success: true,
      message: `${certificationType} 자격증이 발급되었습니다.`,
      requestId: request.id,
    }
  } catch (error) {
    console.error('Error in issueCertificationDirectly:', error)
    return {
      success: false,
      message: '자격증 발급 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 3. 발급 승인/거부
// ============================================

/**
 * 관리자가 발급 신청 승인
 */
export async function approveCertificationRequest(
  requestId: string,
  adminMemo?: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()

  // Validate requestId format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(requestId)) {
      console.error(`Invalid Request ID format: ${requestId}`);
      return { success: false, message: '유효하지 않은 요청 ID입니다.' };
  }

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

    // 2. 신청 상태 업데이트
    const { error } = await supabase
      .from('certification_requests')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        admin_memo: adminMemo,
      })
      .eq('id', requestId)

    if (error) {
      console.error('Error approving certification request:', error)
      return { success: false, message: '승인 처리에 실패했습니다.' }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin/certifications')

    return { success: true, message: '자격증 발급이 승인되었습니다.' }
  } catch (error) {
    console.error('Error in approveCertificationRequest:', error)
    return { success: false, message: '승인 처리 중 오류가 발생했습니다.' }
  }
}

/**
 * 관리자가 발급 신청 거부 (크레딧 환불)
 */
export async function rejectCertificationRequest(
  requestId: string,
  adminMemo?: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()

  // Validate requestId format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(requestId)) {
      console.error(`Invalid Request ID format: ${requestId}`);
      return { success: false, message: '유효하지 않은 요청 ID입니다.' };
  }

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

    // 2. 신청 정보 조회
    const { data: request, error: fetchError } = await supabase
      .from('certification_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError || !request) {
      console.error('Error fetching certification request:', fetchError)
      return { success: false, message: '신청 정보를 찾을 수 없습니다.' }
    }

    // 3. 크레딧 환불
    const { error: refundError } = await supabase.rpc('add_credits', {
      p_user_id: request.user_id,
      p_amount: request.credit_cost,
      p_reason: `certification_rejected_${request.certification_type}`,
      p_related_entity_id: requestId,
      p_related_entity_type: 'certification_request',
      p_memo: `${request.certification_type} 자격증 발급 거부 환불 (${request.credit_cost}C 반환)`,
    })

    if (refundError) {
      console.error('Error refunding credits:', refundError)
      return { success: false, message: '크레딧 환불에 실패했습니다.' }
    }

    // 4. 신청 상태 업데이트
    const { error: updateError } = await supabase
      .from('certification_requests')
      .update({
        status: 'rejected',
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        admin_memo: adminMemo,
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Error updating certification request:', updateError)
      return {
        success: false,
        message: '거부 처리에 실패했습니다. (크레딧은 환불되었습니다)',
      }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin/certifications')

    return {
      success: true,
      message: '자격증 발급이 거부되었으며, 크레딧이 환불되었습니다.',
    }
  } catch (error) {
    console.error('Error in rejectCertificationRequest:', error)
    return { success: false, message: '거부 처리 중 오류가 발생했습니다.' }
  }
}

// ============================================
// 4. 발급 내역 조회
// ============================================

/**
 * 사용자의 자격증 발급 내역 조회
 */
export async function getCertificationRequests(
  userId: string
): Promise<CertificationRequest[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('certification_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching certification requests:', error)
    throw new Error('자격증 발급 내역 조회에 실패했습니다.')
  }

  return data || []
}

/**
 * 관리자용: 모든 자격증 발급 내역 조회
 */
export async function getAllCertificationRequests(): Promise<
  CertificationRequest[]
> {
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
    .from('certification_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all certification requests:', error)
    throw new Error('자격증 발급 내역 조회에 실패했습니다.')
  }

  return data || []
}
