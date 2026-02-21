import { createBrowserClient } from '@supabase/ssr'

/**
 * 브라우저(클라이언트 사이드)에서 Supabase에 접근하기 위한 클라이언트를 생성합니다.
 * 이 함수는 React 컴포넌트 내에서 데이터를 직접 조회하거나 실시간 기능을 사용할 때 쓰입니다.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
