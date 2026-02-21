import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 미들웨어에서 사용자의 세션을 확인하고 갱신하는 역할을 합니다.
 * 서버 컴포넌트가 최신 로그인 정보를 유지할 수 있도록 모든 요청마다 세션을 체크합니다.
 * 
 * @param request 들어오는 HTTP 요청 객체
 * @returns 갱신된 쿠키 정보가 포함된 응답 객체
 */
export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // 브라우저의 쿠키를 설정합니다.
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    // 응답 헤더에도 쿠키 정보를 추가하여 브라우저에 전달합니다.
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 세션 토큰이 만료되었을 경우 자동으로 토큰을 갱신합니다.
    // 로그인이 필요한 페이지의 권한 체크를 위해 필수적인 단계입니다.
    await supabase.auth.getUser()

    return supabaseResponse
}
