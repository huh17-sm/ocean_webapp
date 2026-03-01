'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * 서버 사이드에서 로그아웃을 처리합니다.
 * 서버의 쿠키까지 완전히 정리하여, 크롬 등 엄격한 브라우저에서도 확실하게 로그아웃됩니다.
 */
export async function signOutAction() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    
    // 모든 캐시된 페이지를 무효화
    revalidatePath('/', 'layout')
    
    // 홈으로 리다이렉트
    redirect('/')
}
