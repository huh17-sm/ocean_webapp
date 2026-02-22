'use client'

/**
 * 과정 임의 등록 다이얼로그 컴포넌트
 *
 * 관리자가 학생을 직접 과정에 등록시키는 기능:
 * - 학생 검색/선택
 * - 과정 선택
 * - 등록 실행
 */

import { useState, useMemo, useTransition } from 'react'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, Search, UserPlus, Sparkles } from 'lucide-react'
import { assignCourseToUser } from '@/app/admin/actions/course-enrollment'
import { toast } from 'sonner'

interface ManualRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeCourses: any[]
  allStudents: any[]
}

export function ManualRegisterDialog({
  open,
  onOpenChange,
  activeCourses,
  allStudents,
}: ManualRegisterDialogProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [studentSearch, setStudentSearch] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // 학생 검색 필터
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return allStudents.slice(0, 20) // 기본 20명 표시
    const query = studentSearch.toLowerCase()
    return allStudents.filter(
      (s: any) =>
        s.name?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query)
    )
  }, [allStudents, studentSearch])

  const selectedStudent = allStudents.find((s: any) => s.id === selectedStudentId)
  const selectedCourse = activeCourses.find((c: any) => c.id === selectedCourseId)

  /** 등록 실행 */
  const handleRegister = () => {
    if (!selectedStudentId) {
      setError('학생을 선택해주세요.')
      return
    }
    if (!selectedCourseId) {
      setError('과정을 선택해주세요.')
      return
    }

    setError('')
    startTransition(async () => {
      try {
        const result = await assignCourseToUser({
          userId: selectedStudentId,
          courseId: selectedCourseId,
        })

        if (result.success) {
          toast.success(result.message)
          onOpenChange(false)
          setSelectedStudentId('')
          setSelectedCourseId('')
          setStudentSearch('')
        } else {
          setError(result.message)
        }
      } catch {
        setError('등록 처리 중 오류가 발생했습니다.')
      }
    })
  }

  /** 다이얼로그 닫기 시 초기화 */
  const handleClose = (v: boolean) => {
    if (!v) {
      setSelectedStudentId('')
      setSelectedCourseId('')
      setStudentSearch('')
      setError('')
    }
    onOpenChange(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            과정 임의 등록
          </DialogTitle>
          <DialogDescription>
            학생을 선택하여 과정에 직접 등록합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 학생 검색 */}
          <div className="space-y-2">
            <Label>학생 검색</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="이름 또는 이메일로 검색..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* 학생 선택 */}
          <div className="space-y-2">
            <Label>학생 선택</Label>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="학생을 선택하세요" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {filteredStudents.map((student: any) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name || '이름 없음'} ({student.email})
                  </SelectItem>
                ))}
                {filteredStudents.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-500">
                    검색 결과가 없습니다
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 과정 선택 */}
          <div className="space-y-2">
            <Label>과정 선택</Label>
            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="과정을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {activeCourses.map((course: any) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title} ({course.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 선택 요약 */}
          {selectedStudent && selectedCourse && (
            <div className="border rounded-lg p-3 bg-slate-50 space-y-1">
              <p className="text-sm">
                <span className="font-medium">{selectedStudent.name}</span>님을
              </p>
              <p className="text-sm">
                <span className="font-medium">{selectedCourse.title}</span>{' '}
                과정에 등록합니다.
              </p>
              {selectedCourse.price?.standard > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-2 mt-2">
                  <p className="text-xs font-medium text-blue-900">
                    <p className="flex items-center gap-1 text-sm text-green-600 mt-2"><Sparkles className="w-4 h-4" /> 자동으로 {selectedCourse.price.standard}크레딧이 지급됩니다</p>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 에러 표시 */}
          {error && (
            <div className="flex gap-3 p-3 bg-red-50 border border-red-200 rounded">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 안내 */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm text-amber-800">
              ℹ️ 과정을 배정하면 즉시 &apos;in_progress&apos; 상태로 시작됩니다.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            onClick={handleRegister}
            disabled={isPending || !selectedStudentId || !selectedCourseId}
            className="gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            등록하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
