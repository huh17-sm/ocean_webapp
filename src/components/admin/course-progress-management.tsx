'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  updateCourseProgress,
  getStudentCourseProgress,
} from '@/app/admin/actions/skills'
import { Loader2, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Student {
  id: string
  name: string
  email: string
}

interface CourseProgressManagementProps {
  students: Student[]
}

const courseLevels = ['입문', '초급', '중급', '고급']
const statusOptions = [
  { value: 'in_progress', label: '진행중' },
  { value: 'completed', label: '완료' },
  { value: 'dropped', label: '중단' },
]

export function CourseProgressManagement({
  students,
}: CourseProgressManagementProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [courseLevel, setCourseLevel] = useState('')
  const [status, setStatus] = useState('in_progress')
  const [theoryCompleted, setTheoryCompleted] = useState(false)
  const [poolSessions, setPoolSessions] = useState('0')
  const [notes, setNotes] = useState('')
  const [studentProgress, setStudentProgress] = useState<any[]>([])

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student)
    setCourseLevel('')
    setStatus('in_progress')
    setTheoryCompleted(false)
    setPoolSessions('0')
    setNotes('')

    // 학생의 코스 진도 가져오기
    const progress = await getStudentCourseProgress(student.id)
    setStudentProgress(progress)

    // 기존 진도가 있으면 값 채우기
    if (progress.length > 0) {
      const latest = progress[0]
      setCourseLevel(latest.course_level)
      setStatus(latest.status)
      setTheoryCompleted(latest.theory_completed)
      setPoolSessions(String(latest.pool_sessions_completed))
      setNotes(latest.notes || '')
    }
  }

  const handleUpdateProgress = () => {
    if (!selectedStudent || !courseLevel) {
      toast({
        title: '입력 오류',
        description: '학생과 코스 레벨을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    startTransition(async () => {
      const result = await updateCourseProgress({
        user_id: selectedStudent.id,
        course_level: courseLevel,
        status: status as any,
        theory_completed: theoryCompleted,
        pool_sessions_completed: parseInt(poolSessions) || 0,
        notes: notes || undefined,
      })

      if (result.success) {
        toast({
          title: '진도 업데이트',
          description: result.message,
        })
        // 진도 목록 새로고침
        const progress = await getStudentCourseProgress(selectedStudent.id)
        setStudentProgress(progress)
      } else {
        toast({
          title: '업데이트 실패',
          description: result.message,
          variant: 'destructive',
        })
      }
    })
  }

  const statusLabels: Record<
    string,
    { label: string; variant: 'default' | 'secondary' | 'destructive' }
  > = {
    in_progress: { label: '진행중', variant: 'default' },
    completed: { label: '완료', variant: 'secondary' },
    dropped: { label: '중단', variant: 'destructive' },
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 학생 선택 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">학생 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="학생 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => handleSelectStudent(student)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedStudent?.id === student.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <p className="font-medium text-sm">{student.name}</p>
                  <p className="text-xs text-slate-500">{student.email}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 진도 업데이트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">진도 업데이트</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedStudent ? (
            <p className="text-center text-slate-500 py-8">
              왼쪽에서 학생을 선택하세요
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <Label>학생</Label>
                <p className="text-sm font-medium mt-1">{selectedStudent.name}</p>
              </div>

              <div>
                <Label>코스 레벨</Label>
                <Select value={courseLevel} onValueChange={setCourseLevel}>
                  <SelectTrigger>
                    <SelectValue placeholder="레벨 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {courseLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>상태</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>이론 교육 완료</Label>
                <Switch checked={theoryCompleted} onCheckedChange={setTheoryCompleted} />
              </div>

              <div>
                <Label>수영장 세션 완료 수</Label>
                <Input
                  type="number"
                  min="0"
                  value={poolSessions}
                  onChange={(e) => setPoolSessions(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>메모 (선택)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="진도 관련 메모..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleUpdateProgress}
                disabled={isPending || !courseLevel}
                className="w-full"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    업데이트 중...
                  </>
                ) : (
                  '진도 업데이트'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 학생 진도 현황 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">현재 진도 현황</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedStudent ? (
            <p className="text-center text-slate-500 py-8">
              학생을 선택하면 진도 현황이 표시됩니다
            </p>
          ) : studentProgress.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              아직 등록된 진도가 없습니다
            </p>
          ) : (
            <div className="space-y-3">
              {studentProgress.map((progress) => {
                const statusInfo = statusLabels[progress.status] || statusLabels.in_progress

                return (
                  <div
                    key={progress.id}
                    className="p-3 rounded-lg border bg-slate-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-sm">{progress.course_level} 과정</p>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </div>
                    <div className="space-y-1 text-xs text-slate-600">
                      <p>
                        이론: {progress.theory_completed ? '완료 ✅' : '미완료'}
                      </p>
                      <p>수영장 세션: {progress.pool_sessions_completed}회</p>
                      <p className="text-slate-500">
                        시작: {new Date(progress.started_at).toLocaleDateString('ko-KR')}
                      </p>
                      {progress.completed_at && (
                        <p className="text-slate-500">
                          완료: {new Date(progress.completed_at).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                      {progress.notes && (
                        <p className="text-slate-600 bg-white p-2 rounded mt-2">
                          {progress.notes}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
