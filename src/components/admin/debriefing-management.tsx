'use client'

import { useState, useTransition, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  saveDebriefingBulk,
  getDebriefingsByClass,
} from '@/app/admin/actions/debriefings'
import { getClassStudents } from '@/app/admin/actions'
import { Loader2, Calendar, MapPin } from 'lucide-react'
import { Switch } from '@/components/ui/switch'

interface ClassInfo {
  id: string
  date: string
  time: string
  type: string
  location: string
}

interface DebriefingManagementProps {
  classes: ClassInfo[]
  instructorId: string
}

interface StudentDebriefing {
  reservation_id: string
  student_name: string
  student_email: string
  status: string
  mark_attended: boolean
  performance: string
  improvement: string
  strengths: string
  next_goal: string
  existing_debriefing?: any
}

export function DebriefingManagement({
  classes,
  instructorId,
}: DebriefingManagementProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [debriefings, setDebriefings] = useState<Map<string, StudentDebriefing>>(
    new Map()
  )

  const handleSelectClass = async (classInfo: ClassInfo) => {
    setSelectedClass(classInfo)
    setDebriefings(new Map())

    // 수업의 학생 목록 가져오기
    const classStudents = await getClassStudents(classInfo.id)
    setStudents(classStudents)

    // 기존 디브리핑 가져오기
    const existingDebriefings = await getDebriefingsByClass(classInfo.id)

    // 학생별 디브리핑 초기화
    const newDebriefings = new Map<string, StudentDebriefing>()
    classStudents.forEach((student: any) => {
      const existing = existingDebriefings.find(
        (d: any) => d.reservation_id === student.id
      )

      newDebriefings.set(student.id, {
        reservation_id: student.id,
        student_name: student.profiles?.name || '',
        student_email: student.profiles?.email || '',
        status: student.status,
        mark_attended: student.status === 'confirmed',
        performance: existing?.performance || '',
        improvement: existing?.improvement || '',
        strengths: existing?.strengths || '',
        next_goal: existing?.next_goal || '',
        existing_debriefing: existing,
      })
    })

    setDebriefings(newDebriefings)
  }

  const updateDebriefing = (
    reservationId: string,
    field: keyof StudentDebriefing,
    value: any
  ) => {
    setDebriefings((prev) => {
      const newMap = new Map(prev)
      const current = newMap.get(reservationId)
      if (current) {
        newMap.set(reservationId, { ...current, [field]: value })
      }
      return newMap
    })
  }

  const handleSaveBulk = () => {
    if (!selectedClass || debriefings.size === 0) {
      toast({
        title: '입력 오류',
        description: '수업을 선택하고 최소 1명의 디브리핑을 작성해주세요.',
        variant: 'destructive',
      })
      return
    }

    startTransition(async () => {
      const inputs = Array.from(debriefings.values())
        .filter(
          (d) =>
            d.performance || d.improvement || d.strengths || d.next_goal || d.mark_attended
        )
        .map((d) => ({
          reservation_id: d.reservation_id,
          performance: d.performance || undefined,
          improvement: d.improvement || undefined,
          strengths: d.strengths || undefined,
          next_goal: d.next_goal || undefined,
          mark_attended: d.mark_attended,
        }))

      if (inputs.length === 0) {
        toast({
          title: '입력 오류',
          description: '최소 1명의 디브리핑을 작성하거나 출석 처리를 해주세요.',
          variant: 'destructive',
        })
        return
      }

      const result = await saveDebriefingBulk(inputs)

      if (result.success) {
        toast({
          title: '디브리핑 저장 완료',
          description: result.message,
        })

        // 목록 새로고침
        if (selectedClass) {
          await handleSelectClass(selectedClass)
        }
      } else {
        toast({
          title: '저장 실패',
          description: result.message,
          variant: 'destructive',
        })

        if (result.errors.length > 0) {
          console.error('Failed debriefings:', result.errors)
        }
      }
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* 수업 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">수업 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {classes.map((classInfo) => (
              <button
                key={classInfo.id}
                onClick={() => handleSelectClass(classInfo)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedClass?.id === classInfo.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'hover:bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{classInfo.type}</Badge>
                </div>
                <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(classInfo.date).toLocaleDateString('ko-KR')} {classInfo.time}
                </p>
                <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {classInfo.location}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 디브리핑 작성 */}
      <div className="lg:col-span-3">
        {!selectedClass ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-slate-500 py-12">
                왼쪽에서 수업을 선택하세요
              </p>
            </CardContent>
          </Card>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-slate-500 py-12">
                이 수업에 등록된 학생이 없습니다
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Array.from(debriefings.values()).map((debriefing) => (
              <Card key={debriefing.reservation_id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">
                        {debriefing.student_name}
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-1">
                        {debriefing.student_email}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`attend-${debriefing.reservation_id}`} className="text-sm">
                          출석 처리
                        </Label>
                        <Switch
                          id={`attend-${debriefing.reservation_id}`}
                          checked={debriefing.mark_attended}
                          onCheckedChange={(checked) =>
                            updateDebriefing(debriefing.reservation_id, 'mark_attended', checked)
                          }
                          disabled={debriefing.status === 'attended'}
                        />
                      </div>
                      <Badge
                        variant={
                          debriefing.status === 'attended'
                            ? 'secondary'
                            : 'outline'
                        }
                      >
                        {debriefing.status === 'attended' ? '출석 완료' : '예약 확인'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm">🎯 수행 평가</Label>
                    <Textarea
                      value={debriefing.performance}
                      onChange={(e) =>
                        updateDebriefing(
                          debriefing.reservation_id,
                          'performance',
                          e.target.value
                        )
                      }
                      placeholder="학생의 수행 평가를 작성하세요..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">✨ 잘한 점</Label>
                    <Textarea
                      value={debriefing.strengths}
                      onChange={(e) =>
                        updateDebriefing(
                          debriefing.reservation_id,
                          'strengths',
                          e.target.value
                        )
                      }
                      placeholder="학생이 잘한 점을 작성하세요..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">📈 개선 포인트</Label>
                    <Textarea
                      value={debriefing.improvement}
                      onChange={(e) =>
                        updateDebriefing(
                          debriefing.reservation_id,
                          'improvement',
                          e.target.value
                        )
                      }
                      placeholder="개선이 필요한 부분을 작성하세요..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm">🎓 다음 목표</Label>
                    <Textarea
                      value={debriefing.next_goal}
                      onChange={(e) =>
                        updateDebriefing(
                          debriefing.reservation_id,
                          'next_goal',
                          e.target.value
                        )
                      }
                      placeholder="다음 수업의 목표를 작성하세요..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  {debriefing.existing_debriefing && (
                    <div className="text-xs text-slate-500 pt-2 border-t">
                      기존 디브리핑 작성일:{' '}
                      {new Date(
                        debriefing.existing_debriefing.created_at
                      ).toLocaleDateString('ko-KR')}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="sticky bottom-6 bg-white border rounded-lg shadow-lg p-4 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedClass(null)}>
                취소
              </Button>
              <Button onClick={handleSaveBulk} disabled={isPending} size="lg">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  '일괄 저장'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
