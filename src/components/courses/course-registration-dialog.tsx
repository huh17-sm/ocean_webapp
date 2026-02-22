'use client'

import { useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Loader2, Sparkles, FileText } from 'lucide-react'
import { requestCourseRegistration } from '@/app/actions/course-enrollment'
import { toast } from 'sonner'

interface CourseRegistrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: {
    id: string
    title: string
    level: string
    description?: string
    price?: any
    curriculum_details?: string[]
  }
}

export function CourseRegistrationDialog({
  open,
  onOpenChange,
  course,
}: CourseRegistrationDialogProps) {
  const [error, setError] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const handleRequestCourse = () => {
    setError('')
    startTransition(async () => {
      const result = await requestCourseRegistration(course.id)
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
      } else {
        setError(result.message)
      }
    })
  }

  // 크레딧 정보 추출
  const creditAmount = course.price?.standard || course.price?.credits || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>과정 신청</DialogTitle>
          <DialogDescription>
            과정을 신청하고 관리자의 승인을 기다립니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 과정 정보 */}
          <div className="border rounded-lg p-4 space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{course.title}</h3>
              <Badge variant="outline" className="mt-2">
                {course.level}
              </Badge>
            </div>

            {course.description && (
              <p className="text-sm text-slate-600">{course.description}</p>
            )}

            {/* 크레딧 정보 */}
            {creditAmount > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm font-medium text-blue-900">
                  <span className="flex items-center gap-1"><Sparkles className="w-4 h-4 text-green-500"/> 승인 시 {creditAmount}크레딧 지급</span>
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  과정 등록을 승인받으면 자동으로 크레딧이 계정에 추가됩니다.
                </p>
              </div>
            )}

            {/* 커리큘럼 */}
            {course.curriculum_details && course.curriculum_details.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">과정 내용:</p>
                <ul className="text-sm text-slate-600 space-y-1">
                  {course.curriculum_details.map((item, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 안내 */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm text-amber-800">
              <span className="flex items-start gap-1"><FileText className="w-4 h-4 mt-0.5" /> 신청 후 관리자의 승인을 기다려주세요. 승인되면 알림을 받을 수 있습니다.</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            취소
          </Button>
          <Button
            onClick={handleRequestCourse}
            disabled={isPending}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            신청하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
