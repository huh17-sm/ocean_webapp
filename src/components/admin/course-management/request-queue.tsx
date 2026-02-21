'use client'

/**
 * 과정 신청 대기 큐 컴포넌트
 *
 * pending 상태의 과정 신청을 리스트로 보여주고,
 * 빠르게 승인/거부 처리할 수 있는 UI
 * - 승인 시 지급할 크레딧 금액을 표시하고 수정 가능
 */

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Check,
  X,
  Loader2,
  User,
  Calendar,
  BookOpen,
  Inbox,
  Coins,
  Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  approveCourseRequest,
  rejectCourseRequest,
} from '@/app/admin/actions/course-enrollment'
import type { PendingCourseRequest } from '@/app/admin/actions/course-enrollment'

interface RequestQueueProps {
  requests: PendingCourseRequest[]
}

export function RequestQueue({ requests }: RequestQueueProps) {
  // 처리 완료된 항목을 추적 (UI에서 즉시 제거)
  const [processedIds, setProcessedIds] = useState<Set<number>>(new Set())
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  // 각 신청별 크레딧 금액 편집 상태
  const [editingCreditId, setEditingCreditId] = useState<number | null>(null)
  const [creditAmounts, setCreditAmounts] = useState<Record<number, number>>({})

  // 처리 안 된 신청만 표시
  const visibleRequests = requests.filter((r) => !processedIds.has(r.id))

  /** 크레딧 금액 가져오기 (수정된 값 우선) */
  const getCreditAmount = (request: PendingCourseRequest) => {
    return creditAmounts[request.id] ?? request.creditAmount ?? 0
  }

  /** 크레딧 편집 시작 */
  const startEditCredit = (request: PendingCourseRequest) => {
    setEditingCreditId(request.id)
    if (!(request.id in creditAmounts)) {
      setCreditAmounts((prev) => ({
        ...prev,
        [request.id]: request.creditAmount ?? 0,
      }))
    }
  }

  /** 크레딧 편집 완료 */
  const finishEditCredit = () => {
    setEditingCreditId(null)
  }

  /** 승인 처리 */
  const handleApprove = (request: PendingCourseRequest) => {
    const creditAmount = getCreditAmount(request)
    setProcessingId(request.id)
    startTransition(async () => {
      try {
        const result = await approveCourseRequest({
          progressId: request.id,
          customCreditAmount: creditAmount > 0 ? creditAmount : undefined,
        })

        if (result.success) {
          toast.success(
            `${request.profiles?.name || '학생'}의 ${request.courseTitle || request.course_level} 과정이 승인되었습니다. (${creditAmount}C 지급)`
          )
          setProcessedIds((prev) => new Set(prev).add(request.id))
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error('승인 처리 중 오류가 발생했습니다.')
      } finally {
        setProcessingId(null)
      }
    })
  }

  /** 거부 처리 */
  const handleReject = (request: PendingCourseRequest) => {
    setProcessingId(request.id)
    startTransition(async () => {
      try {
        const result = await rejectCourseRequest({
          progressId: request.id,
        })

        if (result.success) {
          toast.success(
            `${request.profiles?.name || '학생'}의 신청이 거부되었습니다.`
          )
          setProcessedIds((prev) => new Set(prev).add(request.id))
        } else {
          toast.error(result.message)
        }
      } catch {
        toast.error('거부 처리 중 오류가 발생했습니다.')
      } finally {
        setProcessingId(null)
      }
    })
  }

  // 대기 중인 신청이 없을 때
  if (visibleRequests.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm font-medium">
            대기 중인 신청이 없습니다
          </p>
          <p className="text-slate-400 text-xs mt-1">
            새로운 과정 신청이 들어오면 여기에 표시됩니다
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {visibleRequests.map((request) => {
        const isProcessing = processingId === request.id && isPending
        const appliedDate = request.created_at
          ? new Date(request.created_at).toLocaleDateString('ko-KR')
          : '-'
        const creditAmount = getCreditAmount(request)
        const isEditingCredit = editingCreditId === request.id

        return (
          <Card key={request.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* 왼쪽: 학생 + 과정 정보 */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-900">
                      {request.profiles?.name || '알 수 없음'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {request.profiles?.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                      <Badge variant="outline" className="text-xs">
                        {request.courseTitle || request.course_level}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {appliedDate}
                    </div>
                    {/* 크레딧 금액 표시/편집 */}
                    <div className="flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5 text-amber-500" />
                      {isEditingCredit ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={creditAmounts[request.id] ?? creditAmount}
                            onChange={(e) =>
                              setCreditAmounts((prev) => ({
                                ...prev,
                                [request.id]: parseInt(e.target.value) || 0,
                              }))
                            }
                            onBlur={finishEditCredit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') finishEditCredit()
                            }}
                            className="h-6 w-16 text-xs px-1.5 text-center"
                            autoFocus
                            min={0}
                          />
                          <span className="text-xs text-slate-500">C</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditCredit(request)}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors"
                          title="클릭하여 크레딧 금액 수정"
                        >
                          {creditAmount}C
                          <Pencil className="h-2.5 w-2.5 ml-0.5 text-amber-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 오른쪽: 승인/거부 버튼 */}
                <div className="flex gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(request)}
                    disabled={isProcessing}
                    className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    거부
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request)}
                    disabled={isProcessing}
                    className="bg-green-600 hover:bg-green-700 gap-1"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    승인
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
