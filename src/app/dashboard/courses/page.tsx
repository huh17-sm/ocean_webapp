import { getAvailableCourses } from '@/app/actions/course-enrollment'
import { CoursesView } from '@/components/dashboard/courses-view'

// 캐싱 방지
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CoursesPage() {
  const courses = await getAvailableCourses()

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">교육 과정</h1>
        <p className="text-slate-600 mt-2">
          원하시는 과정을 선택하고 신청하세요.
        </p>
      </div>

      <CoursesView courses={courses} />
    </div>
  )
}
