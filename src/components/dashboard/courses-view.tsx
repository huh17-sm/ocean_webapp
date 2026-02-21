'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, Award, Info } from 'lucide-react'
import { CourseRegistrationDialog } from '@/components/courses/course-registration-dialog'
import type { AvailableCourse } from '@/app/actions/course-enrollment'

interface CoursesViewProps {
  courses: AvailableCourse[]
}

const statusConfig = {
  pending: {
    label: '승인 대기중',
    icon: Clock,
    color: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  in_progress: {
    label: '진행중',
    icon: CheckCircle,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  completed: {
    label: '수료 완료',
    icon: Award,
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  dropped: {
    label: '중단됨',
    icon: Info,
    color: 'bg-slate-100 text-slate-600 border-slate-200',
  },
}

export function CoursesView({ courses }: CoursesViewProps) {
  const [selectedCourse, setSelectedCourse] = useState<AvailableCourse | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleApplyClick = (course: AvailableCourse) => {
    setSelectedCourse(course)
    setIsDialogOpen(true)
  }

  // 크레딧 금액 추출 함수
  const getCreditAmount = (price: any) => {
    if (!price) return 0
    return price.standard || price.credits || 0
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-500">현재 신청 가능한 과정이 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {courses.map((course) => {
        const creditAmount = getCreditAmount(course.price)
        const userStatus = course.userApplicationStatus
        const StatusIcon = userStatus ? statusConfig[userStatus]?.icon : null

        return (
          <Card key={course.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-xl">{course.title}</CardTitle>
                    <Badge variant="outline">{course.level}</Badge>
                  </div>
                  {course.description && (
                    <p className="text-sm text-slate-600 mt-1">
                      {course.description}
                    </p>
                  )}
                </div>

                {/* 신청 상태 표시 */}
                {userStatus && (
                  <Badge
                    variant="outline"
                    className={`ml-3 flex items-center gap-1.5 ${statusConfig[userStatus]?.color}`}
                  >
                    {StatusIcon && <StatusIcon className="h-3.5 w-3.5" />}
                    {statusConfig[userStatus]?.label}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* 과정 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {course.duration && (
                  <div>
                    <span className="text-slate-500">기간:</span>
                    <span className="ml-2 font-medium">{course.duration}</span>
                  </div>
                )}
                {course.certification && (
                  <div>
                    <span className="text-slate-500">자격증:</span>
                    <span className="ml-2 font-medium">{course.certification}</span>
                  </div>
                )}
                {creditAmount > 0 && (
                  <div className="md:col-span-2">
                    <span className="text-slate-500">등록 시 지급:</span>
                    <span className="ml-2 font-semibold text-blue-600">
                      {creditAmount}크레딧
                    </span>
                  </div>
                )}
              </div>

              {/* 커리큘럼 */}
              {course.curriculum_details && course.curriculum_details.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">
                    과정 내용:
                  </p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                    {course.curriculum_details.map((item, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-blue-600">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 특징 */}
              {course.features && course.features.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {course.features.map((feature, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {feature}
                    </Badge>
                  ))}
                </div>
              )}

              {/* 신청 버튼 */}
              <div className="pt-2">
                {!course.userHasApplied ? (
                  <Button
                    onClick={() => handleApplyClick(course)}
                    className="w-full"
                    size="lg"
                  >
                    과정 신청하기
                  </Button>
                ) : userStatus === 'pending' ? (
                  <Button disabled className="w-full" size="lg" variant="outline">
                    <Clock className="h-4 w-4 mr-2" />
                    승인 대기중입니다
                  </Button>
                ) : userStatus === 'in_progress' ? (
                  <Button disabled className="w-full" size="lg" variant="outline">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    진행중인 과정입니다
                  </Button>
                ) : userStatus === 'completed' ? (
                  <Button disabled className="w-full" size="lg" variant="outline">
                    <Award className="h-4 w-4 mr-2" />
                    수료 완료한 과정입니다
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleApplyClick(course)}
                    className="w-full"
                    size="lg"
                    variant="secondary"
                  >
                    다시 신청하기
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* 신청 다이얼로그 */}
      {selectedCourse && (
        <CourseRegistrationDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          course={selectedCourse}
        />
      )}
    </div>
  )
}
