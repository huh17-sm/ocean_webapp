import { createClient } from '@supabase/supabase-js'

/**
 * Service Role Key를 사용하여 관리자 권한을 가진 Supabase 클라이언트를 생성합니다.
 * 이 클라이언트는 RLS(Row Level Security)를 우회할 수 있으므로 주의해서 사용해야 합니다.
 * 주로 관리자 작업(유저 생성/삭제, 강제 데이터 수정 등)에 사용됩니다.
 */
export function getSupabaseAdmin() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
        throw new Error('Supabase Service Role Key is not defined. Please check your .env file.')
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
