import { createClient } from '@/utils/supabase/server'
import { ClassTypeSettings } from '@/components/admin/class-type-settings'
import { getClassTypeSettings } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
    const settings = await getClassTypeSettings()

    return (
        <div className="container max-w-5xl mx-auto p-6 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-900">시스템 설정</h1>
                <p className="text-slate-500 mt-2">
                    수업 타입 및 크레딧 정책을 관리합니다.
                </p>
            </div>

            <ClassTypeSettings initialSettings={settings} />
        </div>
    )
}
