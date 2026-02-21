'use client'

import { CourseProgress } from '@/app/actions/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

interface CourseProgressCardProps {
  courses: CourseProgress[]
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  in_progress: { label: '진행중', variant: 'default' },
  completed: { label: '완료', variant: 'secondary' },
  dropped: { label: '중단', variant: 'destructive' },
}

const levelLabels: Record<string, string> = {
  입문: '입문',
  초급: '초급',
  중급: '중급',
  고급: '고급',
}

export function CourseProgressCard({ courses }: CourseProgressCardProps) {
  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-slate-500 py-8">
            아직 진행 중인 코스가 없습니다.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {courses.map((course) => {
        const status = statusLabels[course.status] || statusLabels.in_progress
        const levelLabel = levelLabels[course.course_level] || course.course_level

        return (
          <Card key={course.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{levelLabel} 과정</CardTitle>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 이론 완료 여부 */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">이론 교육</span>
                  <Badge variant={course.theory_completed ? 'secondary' : 'outline'}>
                    {course.theory_completed ? '완료' : '미완료'}
                  </Badge>
                </div>

                {/* 수영장 세션 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600">수영장 세션</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {course.pool_sessions_completed}회 완료
                    </span>
                  </div>
                  <Progress value={course.pool_sessions_completed * 10} className="h-2" />
                </div>

                {/* 시작일 */}
                <div className="text-xs text-slate-500 pt-2 border-t">
                  시작일: {new Date(course.started_at).toLocaleDateString('ko-KR')}
                  {course.completed_at && (
                    <> • 완료일: {new Date(course.completed_at).toLocaleDateString('ko-KR')}</>
                  )}
                </div>

                {/* 메모 */}
                {course.notes && (
                  <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md">
                    {course.notes}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
