import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ClassCalendarView from '@/components/classes/calendar-view'

export default async function ClassesPage() {
    const supabase = await createClient()

    // 1. 유저 및 크레딧 정보 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    // 1.5. 사용자의 예약 내역 조회 (확정/출석완료)
    const { data: reservations } = await supabase
        .from('reservations')
        .select('class_id')
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'attended'])

    const userReservedClassIds = reservations?.map(r => r.class_id) || []

    // 2. 전체 수업 목록 조회 (오늘 이후)
    const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true })

    // 3. 차단된 날짜 조회
    const { data: blocks } = await supabase
        .from('availability_blocks')
        .select('*')

    // 4. 수영장 정보 조회
    const { data: pools } = await supabase
        .from('pools')
        .select('*')
        .eq('is_active', true)
        .order('name')

    // 5. 수업 타입 설정 조회 (크레딧 비용)
    const { data: classTypeSettings } = await supabase
        .from('class_type_settings')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

    return (
        <div className="min-h-screen bg-slate-50/50 py-12">
            <div className="container mx-auto px-6 max-w-6xl">
                <div className="mb-12">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">수업 예약</h1>
                    <p className="text-slate-500 mt-2 text-lg">
                        캘린더에서 날짜를 선택하여 수업을 예약하거나 새로 요청하세요.
                    </p>
                </div>

                <ClassCalendarView
                    initialClasses={classes || []}
                    userCredits={Math.max(profile?.general_credits || 0, profile?.credits || 0)}
                    blockedPeriods={blocks || []}
                    pools={pools || []}
                    classTypeSettings={classTypeSettings || []}
                    userReservedClassIds={userReservedClassIds}
                />
            </div>
        </div>
    )
}
