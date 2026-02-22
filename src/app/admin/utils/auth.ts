'use server'

import { createClient } from '@/utils/supabase/server'

interface AdminAuthResult {
  user: any
  profile: any
  supabase: any
}

/**
 * 관리자 권한 검증 및 Supabase 클라이언트 반환
 * 실패 시 에러 throw
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient()

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

  if (!profile || profile.role !== 'admin') {
    throw new Error('관리자 권한이 필요합니다.')
  }

  return { user, profile, supabase }
}
