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
  Trash2,
  ArchiveRestore,
  AlertOctagon,
} from 'lucide-react'
import { toast } from 'sonner'
import { updateCourseProgress } from '@/app/admin/actions/skills'
import { moveToTrash, restoreFromTrash, deletePermanently } from '@/app/admin/actions/course-management'

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

  // 최소 진행 세션 기준
  const minSessionCount = progress?.session_count || 3

  // progress prop이 변경되면 로컬 상태 동기화
  useEffect(() => {
    if (progress) {
      setStatus(progress.status || 'in_progress')
      setTheoryCompleted(progress.theory_completed || false)
      setPoolSessions(progress.pool_sessions_completed || 0)
      setNotes(progress.notes || '')
    }
  }, [progress])

  // 변경 사항 감지
  const hasChanges =
    status !== (progress?.status || 'in_progress') ||
    theoryCompleted !== (progress?.theory_completed || false) ||
    poolSessions !== (progress?.pool_sessions_completed || 0) ||
    notes !== (progress?.notes || '')

  const isDeleted = progress?.status === 'deleted'

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

  // 삭제(휴지통으로)
  const handleMoveToTrash = () => {
    if (!confirm('이 과정을 휴지통으로 이동하시겠습니까? (사용자 화면에서 숨겨집니다)')) return
    startTransition(async () => {
      try {
        const res = await moveToTrash(progress.id)
        if (res.success) {
          toast.success('과정이 숨겨졌습니다 (휴지통 이동).')
          onUpdate()
        } else toast.error('삭제 실패: ' + res.error)
      } catch {
        toast.error('오류가 발생했습니다.')
      }
    })
  }

  // 복원
  const handleRestore = () => {
    startTransition(async () => {
      try {
        const res = await restoreFromTrash(progress.id)
        if (res.success) {
          toast.success('과정이 복구되었습니다.')
          onUpdate() // 부모 컴포넌트 리프레시 (모달 닫힐 수 있음)
        } else toast.error('복구 실패: ' + res.error)
      } catch {
        toast.error('오류가 발생했습니다.')
      }
    })
  }

  // 완전 삭제
  const handleHardDelete = () => {
    if (!confirm('경고: 이 과정의 진도 데이터가 데이터베이스에서 영구 삭제됩니다! 복구할 수 없습니다. 계속하시겠습니까?')) return
    startTransition(async () => {
      try {
        const res = await deletePermanently(progress.id)
        if (res.success) {
          toast.success('과정이 영구 삭제되었습니다.')
          onUpdate()
        } else toast.error('영구 삭제 실패: ' + res.error)
      } catch {
        toast.error('오류가 발생했습니다.')
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
            <SelectItem value="dropped">🔴 만료</SelectItem>
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
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium">풀 세션 완료 횟수 (최소 기준: {minSessionCount}회)</p>
            </div>

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

      {/* 버튼 영역 */}
      {!isDeleted ? (
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <Button
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className="flex-1 gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {hasChanges ? '진도 저장' : '변경 사항 없음'}
          </Button>

          <Button
            variant="outline"
            className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            onClick={handleMoveToTrash}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            과정 숨김 (삭제)
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 mt-6 border-t pt-4">
          <Button
            onClick={handleRestore}
            disabled={isPending}
            className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ArchiveRestore className="h-4 w-4" />
            과정 복구하기
          </Button>

          <Button
            variant="destructive"
            onClick={handleHardDelete}
            disabled={isPending}
            className="flex-1 gap-2"
          >
            <AlertOctagon className="h-4 w-4" />
            영구 삭제 (복구 불가)
          </Button>
        </div>
      )}
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
        <Badge className="bg-red-100 text-red-700">만료</Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-700">대기</Badge>
      )
    case 'deleted':
      return (
        <Badge className="bg-slate-200 text-slate-700">과정 삭제됨</Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}
