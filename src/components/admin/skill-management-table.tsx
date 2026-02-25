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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { completeSkill, uncompleteSkill, getStudentSkills } from '@/app/admin/actions/skills'
import { CheckCircle2, Circle, Loader2, Search } from 'lucide-react'

interface Student {
  id: string
  name: string
  email: string
}

interface SkillManagementTableProps {
  students: Student[]
}

const skillTypes = [
  { value: 'theory', label: '이론 교육' },
  { value: 'static', label: '스태틱 (숨참기)' },
  { value: 'dynamic', label: '다이나믹 (잠영)' },
  { value: 'depth', label: '수심 (컨스탄트웨이트)' },
  { value: 'rescue', label: '레스큐 (구조)' },
]

const courseLevels = ['입문', '초급', '중급', '고급']

export function SkillManagementTable({ students }: SkillManagementTableProps) {

  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedLevel, setSelectedLevel] = useState('')
  const [selectedSkill, setSelectedSkill] = useState('')
  const [notes, setNotes] = useState('')
  const [studentSkills, setStudentSkills] = useState<any[]>([])

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student)
    setSelectedLevel('')
    setSelectedSkill('')
    setNotes('')

    // 학생의 스킬 현황 가져오기
    const skills = await getStudentSkills(student.id)
    setStudentSkills(skills)
  }

  const handleCompleteSkill = () => {
    if (!selectedStudent || !selectedLevel || !selectedSkill) {
      toast.error('입력 오류', {
        description: '학생, 코스 레벨, 스킬 타입을 모두 선택해주세요.',
      })
      return
    }

    startTransition(async () => {
      const result = await completeSkill({
        user_id: selectedStudent.id,
        course_level: selectedLevel,
        skill_type: selectedSkill as any,
        notes,
      })

      if (result.success) {
        toast.success('스킬 완료 처리', {
          description: result.message,
        })
        // 스킬 목록 새로고침
        const skills = await getStudentSkills(selectedStudent.id)
        setStudentSkills(skills)
        setNotes('')
      } else {
        toast.error('처리 실패', {
          description: result.message,
        })
      }
    })
  }

  const handleUncompleteSkill = (skillId: number) => {
    startTransition(async () => {
      const result = await uncompleteSkill(skillId)

      if (result.success) {
        toast.success('스킬 완료 취소', {
          description: result.message,
        })
        // 스킬 목록 새로고침
        if (selectedStudent) {
          const skills = await getStudentSkills(selectedStudent.id)
          setStudentSkills(skills)
        }
      } else {
        toast.error('처리 실패', {
          description: result.message,
        })
      }
    })
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

      {/* 스킬 완료 처리 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">스킬 완료 처리</CardTitle>
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
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
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
                <Label>스킬 타입</Label>
                <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                  <SelectTrigger>
                    <SelectValue placeholder="스킬 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {skillTypes.map((skill) => (
                      <SelectItem key={skill.value} value={skill.value}>
                        {skill.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>메모 (선택)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="스킬 완료 관련 메모..."
                  rows={3}
                />
              </div>

              <Button
                onClick={handleCompleteSkill}
                disabled={isPending || !selectedLevel || !selectedSkill}
                className="w-full"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  '스킬 완료 처리'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 학생 스킬 현황 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">현재 스킬 현황</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedStudent ? (
            <p className="text-center text-slate-500 py-8">
              학생을 선택하면 스킬 현황이 표시됩니다
            </p>
          ) : studentSkills.length === 0 ? (
            <p className="text-center text-slate-500 py-8">
              아직 체크된 스킬이 없습니다
            </p>
          ) : (
            <div className="space-y-3">
              {studentSkills.map((skill) => {
                const skillInfo = skillTypes.find((s) => s.value === skill.skill_type)

                return (
                  <div
                    key={skill.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      skill.is_completed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    {skill.is_completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {skill.course_level}
                        </Badge>
                        <p className="font-medium text-sm">
                          {skillInfo?.label}
                        </p>
                      </div>
                      {skill.is_completed && skill.completed_at && (
                        <p className="text-xs text-slate-500">
                          {new Date(skill.completed_at).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                      {skill.notes && (
                        <p className="text-xs text-slate-600 mt-1">{skill.notes}</p>
                      )}
                      {skill.is_completed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUncompleteSkill(skill.id)}
                          disabled={isPending}
                          className="mt-2 h-7 text-xs"
                        >
                          완료 취소
                        </Button>
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
