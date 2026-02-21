import { createClient } from '@/utils/supabase/server'
import { CourseList } from '@/components/admin/course-list'

import { CreateCourseDialog } from '@/components/admin/create-course-dialog'
import { getClassTypeSettings } from '@/app/admin/settings/actions'

export default async function AdminCoursesPage() {
    const supabase = await createClient()
    const { data: courses } = await supabase
        .from('courses')
        .select('*')
        .order('sort_order', { ascending: true })

    const classTypes = await getClassTypeSettings()

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">교육 과정 관리</h2>
                <CreateCourseDialog classTypes={classTypes} />
            </div>

            <p className="text-slate-500 text-sm">
                홈페이지에 노출되는 교육 과정의 상태를 관리합니다. '준비중' 상태로 설정하면 가격 대신 '별도 문의'가 표시됩니다.
            </p>

            <CourseList courses={courses || []} classTypes={classTypes} />
        </div>
    )
}
