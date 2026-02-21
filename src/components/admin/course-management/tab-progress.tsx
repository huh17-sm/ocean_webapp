'use client'

/**
 * 교육 진도 탭 컴포넌트
 *
 * 학생의 교육 진도를 관리:
 * - 상태 변경 (진행 중 → 수료 / 중단)
 * - 이론 교육 완료 체크
 * - 풀 세션 횟수 변경
 * - 메모 작성
 */

import { useState, useTransition, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Loader2,
  Save,
  BookOpen,
  CheckCircle2,
  Circle,
  Minus,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { updateCourseProgress } from '@/app/admin/actions/skills'
import { getAttendedPoolSessionCount } from '@/app/admin/actions/course-management'

interface TabProgressProps {
  userId: string
  courseLevel: string
  progress: any
  onUpdate: () => void
}

export function TabProgress({
  userId,
  courseLevel,
  progress,
  onUpdate,
}: TabProgressProps) {
  const [isPending, startTransition] = useTransition()

  // 로컬 상태 (수정 중인 값)
  const [status, setStatus] = useState<string>(progress?.status || 'in_progress')
  const [theoryCompleted, setTheoryCompleted] = useState<boolean>(
    progress?.theory_completed || false
  )
  const [poolSessions, setPoolSessions] = useState<number>(
    progress?.pool_sessions_completed || 0
  )
  const [notes, setNotes] = useState<string>(progress?.notes || '')

  // 실제 출석 풀 세션 횟수
  const [actualPoolSessions, setActualPoolSessions] = useState<number | null>(null)
  const [syncLoading, setSyncLoading] = useState(false)

  // progress prop이 변경되면 로컬 상태 동기화
  useEffect(() => {
    if (progress) {
      setStatus(progress.status || 'in_progress')
      setTheoryCompleted(progress.theory_completed || false)
      setPoolSessions(progress.pool_sessions_completed || 0)
      setNotes(progress.notes || '')
    }
  }, [progress])

  // 실제 출석 풀 세션 횟수 로드
  useEffect(() => {
    if (userId) {
      getAttendedPoolSessionCount(userId).then(setActualPoolSessions)
    }
  }, [userId])

  // 실제 출석 횟수로 동기화
  const handleSyncPoolSessions = async () => {
    setSyncLoading(true)
    try {
      const count = await getAttendedPoolSessionCount(userId)
      setActualPoolSessions(count)
      setPoolSessions(count)
      toast.success(`실제 출석 횟수(${count}회)로 동기화되었습니다.`)
    } catch {
      toast.error('출석 횟수 조회에 실패했습니다.')
    } finally {
      setSyncLoading(false)
    }
  }

  // 변경 사항 감지
  const hasChanges =
    status !== (progress?.status || 'in_progress') ||
    theoryCompleted !== (progress?.theory_completed || false) ||
    poolSessions !== (progress?.pool_sessions_completed || 0) ||
    notes !== (progress?.notes || '')

  /** 저장 */
  const handleSave = () => {
    // 변경 사항이 없으면 저장하지 않음
    if (!hasChanges) {
      toast.info('변경 사항이 없습니다.')
      return
    }

    startTransition(async () => {
      try {
        const result = await updateCourseProgress({
          user_id: userId,
          course_level: courseLevel,
          status: status as 'in_progress' | 'completed' | 'dropped',
          theory_completed: theoryCompleted,
          pool_sessions_completed: poolSessions,
          notes: notes || undefined,
        })

        if (result.success) {
          toast.success('교육 진도가 업데이트되었습니다.')
          onUpdate()
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error('저장 중 오류가 발생했습니다.')
      }
    })
  }

  // 풀 세션 증감
  const incrementPool = () => setPoolSessions((prev) => prev + 1)
  const decrementPool = () => setPoolSessions((prev) => Math.max(0, prev - 1))

  // 진도가 없을 때
  if (!progress) {
    return (
      <div className="text-center py-8 text-slate-500">
        <BookOpen className="h-10 w-10 mx-auto mb-3 text-slate-300" />
        <p className="text-sm font-medium">교육 진도 정보가 없습니다</p>
        <p className="text-xs mt-1">이 학생은 아직 이 과정에 등록되지 않았습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 현재 상태 배지 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-600">현재 상태:</span>
        <StatusBadge status={progress.status} />
        {progress.started_at && (
          <span className="text-xs text-slate-400">
            시작일: {new Date(progress.started_at).toLocaleDateString('ko-KR')}
          </span>
        )}
      </div>

      {/* 상태 변경 */}
      <div className="space-y-2">
        <Label>교육 상태 변경</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_progress">🔵 진행 중</SelectItem>
            <SelectItem value="completed">🟢 수료</SelectItem>
            <SelectItem value="dropped">🔴 중단</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 이론 교육 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {theoryCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 text-slate-300" />
              )}
              <div>
                <p className="text-sm font-medium">이론 교육</p>
                <p className="text-xs text-slate-400">
                  이론 수업 완료 여부를 체크합니다
                </p>
              </div>
            </div>
            <Switch
              checked={theoryCompleted}
              onCheckedChange={setTheoryCompleted}
            />
          </div>
        </CardContent>
      </Card>

      {/* 풀 세션 */}
      <Card>
        <CardContent className="p-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">풀 세션 완료 횟수</p>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleSyncPoolSessions}
                disabled={syncLoading}
              >
                {syncLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                출석 데이터 연동
              </Button>
            </div>

            {/* 실제 출석 횟수 표시 */}
            {actualPoolSessions !== null && (
              <div className="flex items-center gap-2 mb-3 text-xs">
                <Badge
                  variant="outline"
                  className={
                    poolSessions === actualPoolSessions
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }
                >
                  실제 출석: {actualPoolSessions}회
                </Badge>
                {poolSessions !== actualPoolSessions && (
                  <span className="text-amber-600">
                    (현재 기록과 {Math.abs(poolSessions - actualPoolSessions)}회 차이)
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={decrementPool}
                disabled={poolSessions <= 0}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-lg font-bold min-w-[60px] text-center">
                {poolSessions}
                <span className="text-sm text-slate-400 font-normal">회</span>
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={incrementPool}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메모 */}
      <div className="space-y-2">
        <Label htmlFor="progress-notes">메모</Label>
        <Textarea
          id="progress-notes"
          placeholder="교육 관련 메모를 작성하세요..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* 저장 버튼 */}
      <Button
        onClick={handleSave}
        disabled={isPending || !hasChanges}
        className="w-full gap-2"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {hasChanges ? '진도 저장' : '변경 사항 없음'}
      </Button>
    </div>
  )
}

// ============================================
// 상태 배지 헬퍼
// ============================================

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'in_progress':
      return (
        <Badge className="bg-blue-100 text-blue-700">진행 중</Badge>
      )
    case 'completed':
      return (
        <Badge className="bg-green-100 text-green-700">수료</Badge>
      )
    case 'dropped':
      return (
        <Badge className="bg-red-100 text-red-700">중단</Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-700">대기</Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
