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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2 } from 'lucide-react'
import { assignCourseToUser } from '@/app/admin/actions/course-enrollment'
import { toast } from 'sonner'

interface AssignCourseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  availableCourses: Array<{
    id: string
    title: string
    level: string
    price?: any
  }>
}

export function AssignCourseDialog({
  open,
  onOpenChange,
  userId,
  userName,
  availableCourses,
}: AssignCourseDialogProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const handleAssign = () => {
    if (!selectedCourseId) {
      setError('과정을 선택해주세요.')
      return
    }

    setError('')
    startTransition(async () => {
      const result = await assignCourseToUser({
        userId,
        courseId: selectedCourseId,
      })

      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        setSelectedCourseId('')
      } else {
        setError(result.message)
      }
    })
  }

  const selectedCourse = availableCourses.find((c) => c.id === selectedCourseId)
  const creditAmount = selectedCourse?.price?.standard || selectedCourse?.price?.credits || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>과정 직접 배정</DialogTitle>
          <DialogDescription>
            {userName}님에게 과정을 직접 배정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 과정 선택 */}
          <div className="space-y-2">
            <Label htmlFor="course-select">과정 선택</Label>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger id="course-select">
                <SelectValue placeholder="과정을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {availableCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title} ({course.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 선택된 과정 정보 */}
          {selectedCourse && (
            <div className="border rounded-lg p-3 bg-slate-50 space-y-2">
              <div>
                <p className="text-sm font-medium">{selectedCourse.title}</p>
                <p className="text-xs text-slate-600">{selectedCourse.level}</p>
              </div>

              {creditAmount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2">
                  <p className="text-xs font-medium text-blue-900">
                    ✨ 자동으로 {creditAmount}크레딧 지급됩니다
                  </p>
                </div>
              )}
            </div>
          )}

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
              ℹ️ 과정을 배정하면 즉시 'in_progress' 상태로 시작되며, 크레딧이 자동으로 지급됩니다.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setSelectedCourseId('')
              setError('')
            }}
            disabled={isPending}
          >
            취소
          </Button>
          <Button onClick={handleAssign} disabled={isPending || !selectedCourseId} className="gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            배정하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
