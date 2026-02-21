import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 서버 사이드(Server Components, API Routes 등)에서 Supabase에 접근하기 위한 클라이언트를 생성합니다.
 * 쿠키를 통해 로그인을 유지하고 보안이 필요한 데이터를 처리할 때 사용합니다.
 */
export async function createClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // 서버 컴포넌트에서 이 함수가 호출될 때 발생하는 에러를 무시합니다.
                        // 일반적으로 미들웨어에서 세션을 갱신하도록 구성되어 있으면 안전합니다.
                    }
                },
            },
        }
    )
}
