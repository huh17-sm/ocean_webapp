import { getPendingCourseRequests } from '@/app/admin/actions/course-enrollment'
import { BookOpen } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PendingCourseRequests } from '@/components/admin/pending-course-requests'

export default async function CourseEnrollmentsPage() {
  const pendingRequests = await getPendingCourseRequests()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">과정 신청 관리</h2>
        <p className="text-slate-500">
          사용자가 신청한 교육 과정 등록 요청을 관리합니다.
        </p>
      </div>

      {/* 대기 중인 신청 목록 */}
      <div className="grid gap-6">
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    신청 대기 목록
                </CardTitle>
                <CardDescription>
                    승인이 필요한 과정 신청 내역입니다.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <PendingCourseRequests requests={pendingRequests} />
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
