'use server'

/**
 * 자격증 관리 서버 액션 v2 (강사/관리자용)
 *
 * 이 파일은 v2 certificates 테이블을 사용한 자격증 관리 액션을 포함합니다:
 * - 자격증 신청 (사용자)
 * - 자격증 승인/거부 (관리자)
 * - 자격증 발급 (관리자)
 * - 자격증 조회
 */

import { createClient } from '@/utils/supabase/server'
import { getSupabaseAdmin } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

// ============================================
// 1. 자격증 신청 (사용자)
// ============================================

export interface CertificateApplyInput {
  certificate_level: string // 입문/초급/중급/고급
  credit_paid?: number
}

/**
 * 사용자가 자격증 발급 신청
 */
export async function applyCertificate(
  input: CertificateApplyInput
): Promise<{ success: boolean; message: string; certificateId?: number }> {
  const supabase = await createClient()

  try {
    // 1. 사용자 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, message: '로그인이 필요합니다.' }
    }

    // 2. 중복 신청 확인 (pending 또는 approved 상태의 동일 레벨 신청이 있는지)
    const { data: existing } = await supabase
      .from('certificates')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('certificate_level', input.certificate_level)
      .in('status', ['pending', 'approved', 'issued'])
      .maybeSingle()

    if (existing) {
      return {
        success: false,
        message: '이미 신청했거나 발급된 자격증입니다.',
      }
    }

    // 3. 자격증 신청 생성
    const { data: certificate, error: createError } = await supabase
      .from('certificates')
      .insert({
        user_id: user.id,
        certificate_level: input.certificate_level,
        status: 'pending',
        credit_paid: input.credit_paid || 0,
        applied_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (createError || !certificate) {
      console.error('Error creating certificate application:', createError)
      return { success: false, message: '자격증 신청에 실패했습니다.' }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin/certificates')

    return {
      success: true,
      message: '자격증 발급 신청이 완료되었습니다.',
      certificateId: certificate.id,
    }
  } catch (error) {
    console.error('Error in applyCertificate:', error)
    return {
      success: false,
      message: '자격증 신청 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 2. 자격증 승인 (관리자)
// ============================================

export interface ApproveCertificateInput {
  certificate_id: number
  admin_notes?: string
}

/**
 * 관리자가 자격증 신청 승인
 */
export async function approveCertificate(
  input: ApproveCertificateInput
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

    // 2. 자격증 정보 확인
    const { data: certificate } = await supabase
      .from('certificates')
      .select('id, status')
      .eq('id', input.certificate_id)
      .single()

    if (!certificate) {
      return { success: false, message: '자격증 정보를 찾을 수 없습니다.' }
    }

    if (certificate.status !== 'pending') {
      return {
        success: false,
        message: '대기 중인 신청만 승인할 수 있습니다.',
      }
    }

    // 3. 승인 처리
    const { error: updateError } = await supabase
      .from('certificates')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        admin_notes: input.admin_notes || null,
      })
      .eq('id', input.certificate_id)

    if (updateError) {
      console.error('Error approving certificate:', updateError)
      return { success: false, message: '승인 처리에 실패했습니다.' }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin/certificates')

    return { success: true, message: '자격증이 승인되었습니다.' }
  } catch (error) {
    console.error('Error in approveCertificate:', error)
    return {
      success: false,
      message: '승인 처리 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 3. 자격증 거부 (관리자)
// ============================================

export interface RejectCertificateInput {
  certificate_id: number
  rejection_reason: string
  admin_notes?: string
}

/**
 * 관리자가 자격증 신청 거부
 */
export async function rejectCertificate(
  input: RejectCertificateInput
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

    // 2. 자격증 정보 확인
    const { data: certificate } = await supabase
      .from('certificates')
      .select('id, status')
      .eq('id', input.certificate_id)
      .single()

    if (!certificate) {
      return { success: false, message: '자격증 정보를 찾을 수 없습니다.' }
    }

    if (certificate.status !== 'pending') {
      return {
        success: false,
        message: '대기 중인 신청만 거부할 수 있습니다.',
      }
    }

    // 3. 거부 처리
    const { error: updateError } = await supabase
      .from('certificates')
      .update({
        status: 'rejected',
        rejection_reason: input.rejection_reason,
        admin_notes: input.admin_notes || null,
      })
      .eq('id', input.certificate_id)

    if (updateError) {
      console.error('Error rejecting certificate:', updateError)
      return { success: false, message: '거부 처리에 실패했습니다.' }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin/certificates')

    return { success: true, message: '자격증 신청이 거부되었습니다.' }
  } catch (error) {
    console.error('Error in rejectCertificate:', error)
    return {
      success: false,
      message: '거부 처리 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 4. 자격증 발급 (관리자)
// ============================================

export interface IssueCertificateInput {
  certificate_id: number
  certificate_number: string
  admin_notes?: string
}

/**
 * 관리자가 자격증 발급 (승인 후 번호 부여)
 */
export async function issueCertificate(
  input: IssueCertificateInput
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

    // 2. 자격증 정보 확인
    const { data: certificate } = await supabase
      .from('certificates')
      .select('id, status')
      .eq('id', input.certificate_id)
      .single()

    if (!certificate) {
      return { success: false, message: '자격증 정보를 찾을 수 없습니다.' }
    }

    if (certificate.status !== 'approved') {
      return {
        success: false,
        message: '승인된 신청만 발급할 수 있습니다.',
      }
    }

    // 3. 자격증 번호 중복 확인
    const { data: existingNumber } = await supabase
      .from('certificates')
      .select('id')
      .eq('certificate_number', input.certificate_number)
      .maybeSingle()

    if (existingNumber) {
      return {
        success: false,
        message: '이미 사용 중인 자격증 번호입니다.',
      }
    }

    // 4. 발급 처리
    const { error: updateError } = await supabase
      .from('certificates')
      .update({
        status: 'issued',
        certificate_number: input.certificate_number,
        issued_at: new Date().toISOString(),
        admin_notes: input.admin_notes || null,
      })
      .eq('id', input.certificate_id)

    if (updateError) {
      console.error('Error issuing certificate:', updateError)
      return { success: false, message: '발급 처리에 실패했습니다.' }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin/certificates')

    return { success: true, message: '자격증이 발급되었습니다.' }
  } catch (error) {
    console.error('Error in issueCertificate:', error)
    return {
      success: false,
      message: '발급 처리 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 5. 자격증 직접 발급 (관리자 - 신청 없이)
// ============================================

export interface DirectIssueCertificateInput {
  user_id: string
  certificate_level: string
  certificate_number: string
  credit_paid?: number
  admin_notes?: string
}

/**
 * 관리자가 신청 절차 없이 자격증 직접 발급
 */
export async function issueCertificateDirectly(
  input: DirectIssueCertificateInput
): Promise<{ success: boolean; message: string; certificateId?: number }> {
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

    // 2. 자격증 번호 중복 확인
    const { data: existingNumber } = await supabase
      .from('certificates')
      .select('id')
      .eq('certificate_number', input.certificate_number)
      .maybeSingle()

    if (existingNumber) {
      return {
        success: false,
        message: '이미 사용 중인 자격증 번호입니다.',
      }
    }

    // 3. 자격증 직접 발급
    const now = new Date().toISOString()
    const { data: certificate, error: createError } = await supabase
      .from('certificates')
      .insert({
        user_id: input.user_id,
        certificate_level: input.certificate_level,
        status: 'issued',
        certificate_number: input.certificate_number,
        credit_paid: input.credit_paid || 0,
        applied_at: now,
        approved_at: now,
        issued_at: now,
        admin_notes: input.admin_notes || null,
      })
      .select('id')
      .single()

    if (createError || !certificate) {
      console.error('Error issuing certificate directly:', createError)
      return { success: false, message: '자격증 발급에 실패했습니다.' }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin/certificates')

    return {
      success: true,
      message: '자격증이 발급되었습니다.',
      certificateId: certificate.id,
    }
  } catch (error) {
    console.error('Error in issueCertificateDirectly:', error)
    return {
      success: false,
      message: '자격증 발급 중 오류가 발생했습니다.',
    }
  }
}

// ============================================
// 6. 자격증 조회
// ============================================

/**
 * 사용자의 자격증 목록 조회
 */
export async function getMyCertificates() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('로그인이 필요합니다.')
  }

  const { data, error } = await supabase
    .from('certificates')
    .select('*')
    .eq('user_id', user.id)
    .order('applied_at', { ascending: false })

  if (error) {
    console.error('Error fetching certificates:', error)
    throw new Error('자격증 조회에 실패했습니다.')
  }

  return data || []
}

/**
 * 관리자용: 모든 자격증 목록 조회
 */
/**
 * 관리자용: 모든 자격증 목록 조회 (Manual Join)
 */
export async function getAllCertificates() {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    // 1. 자격증 목록 조회 (Join 없이)
    const { data: certificates, error: certError } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .order('applied_at', { ascending: false })

    if (certError) {
      console.error('Error fetching all certificates table:', JSON.stringify(certError, null, 2))
      throw new Error('자격증 목록 조회에 실패했습니다.')
    }

    if (!certificates || certificates.length === 0) {
      return []
    }

    // 2. 관련 사용자 ID 추출
    const userIds = Array.from(new Set(certificates.map((c) => c.user_id)))

    // 3. 사용자 프로필 조회
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds)

    if (profileError) {
      console.error('Error fetching profiles for certificates:', JSON.stringify(profileError, null, 2))
      // 프로필 조회 실패해도 자격증 목록은 반환하되, 사용자 정보는 없을 수 있음
    }

    // 4. 데이터 병합 (In-memory Join)
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    const result = certificates.map((cert) => ({
      ...cert,
      user: profileMap.get(cert.user_id) || null,
    }))

    return result
  } catch (error) {
    console.error('Error in getAllCertificates:', error)
    throw new Error('자격증 전체 조회 중 오류가 발생했습니다.')
  }
}

/**
 * 관리자용: 대기 중인 자격증 신청 조회 (Manual Join)
 */
export async function getPendingCertificates() {
  const supabaseAdmin = getSupabaseAdmin()

  try {
    // 1. 대기 중인 자격증 조회 (Join 없이)
    const { data: certificates, error: certError } = await supabaseAdmin
      .from('certificates')
      .select('*')
      .eq('status', 'pending')
      .order('applied_at', { ascending: true })

    if (certError) {
      console.error('Error fetching pending certificates table:', JSON.stringify(certError, null, 2))
      throw new Error('대기 중인 자격증 조회에 실패했습니다.')
    }

    if (!certificates || certificates.length === 0) {
      return []
    }

    // 2. 관련 사용자 ID 추출
    const userIds = Array.from(new Set(certificates.map((c) => c.user_id)))

    // 3. 사용자 프로필 조회
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds)

    if (profileError) {
      console.error('Error fetching profiles for pending certificates:', JSON.stringify(profileError, null, 2))
    }

    // 4. 데이터 병합 (In-memory Join)
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    const result = certificates.map((cert) => ({
      ...cert,
      user: profileMap.get(cert.user_id) || null,
    }))

    return result
  } catch (error) {
    console.error('Error in getPendingCertificates:', error)
    throw new Error('대기 중인 자격증 조회 중 오류가 발생했습니다.')
  }
}

/**
 * 특정 학생의 자격증 목록 조회
 */
export async function getStudentCertificates(userId: string) {
  const supabaseAdmin = getSupabaseAdmin()

  const { data, error } = await supabaseAdmin
    .from('certificates')
    .select('*')
    .eq('user_id', userId)
    .order('applied_at', { ascending: false })

  if (error) {
    console.error('Error fetching student certificates:', error)
    return []
  }

  return data || []
}

// ============================================
// 7. 자격증 수정/삭제
// ============================================

/**
 * 관리자가 자격증 정보 수정
 */
export async function updateCertificate(
  certificateId: number,
  updates: Partial<{
    certificate_level: string
    certificate_number: string
    credit_paid: number
    admin_notes: string
  }>
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

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

    // 2. 자격증 정보 수정 (Admin client로 RLS 우회)
    const { error: updateError } = await supabaseAdmin
      .from('certificates')
      .update(updates)
      .eq('id', certificateId)

    if (updateError) {
      console.error('Error updating certificate:', JSON.stringify(updateError))
      return { success: false, message: '자격증 정보 수정에 실패했습니다.' }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin/certificates')
    revalidatePath('/admin')

    return { success: true, message: '자격증 정보가 수정되었습니다.' }
  } catch (error) {
    console.error('Error in updateCertificate:', error)
    return {
      success: false,
      message: '자격증 정보 수정 중 오류가 발생했습니다.',
    }
  }
}

/**
 * 관리자가 자격증 삭제
 */
export async function deleteCertificate(
  certificateId: number
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient()
  const supabaseAdmin = getSupabaseAdmin()

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

    // 2. 자격증 삭제 (Admin client로 RLS 우회)
    const { error: deleteError } = await supabaseAdmin
      .from('certificates')
      .delete()
      .eq('id', certificateId)

    if (deleteError) {
      console.error('Error deleting certificate:', JSON.stringify(deleteError))
      return { success: false, message: '자격증 삭제에 실패했습니다.' }
    }

    revalidatePath('/mypage')
    revalidatePath('/admin/certificates')
    revalidatePath('/admin')

    return { success: true, message: '자격증이 삭제되었습니다.' }
  } catch (error) {
    console.error('Error in deleteCertificate:', error)
    return {
      success: false,
      message: '자격증 삭제 중 오류가 발생했습니다.',
    }
  }
}
