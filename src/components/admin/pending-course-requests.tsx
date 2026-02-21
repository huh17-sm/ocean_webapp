'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'
import { approveCourseRequest, rejectCourseRequest } from '@/app/admin/actions/course-enrollment'
import type { PendingCourseRequest } from '@/app/admin/actions/course-enrollment'
import { toast } from 'sonner'

interface PendingCourseRequestsProps {
  requests: PendingCourseRequest[]
}

export function PendingCourseRequests({ requests }: PendingCourseRequestsProps) {
  const [isPending, startTransition] = useTransition()
  const [processingId, setProcessingId] = useState<number | null>(null)

  const handleApprove = (progressId: number) => {
    setProcessingId(progressId)
    startTransition(async () => {
      const result = await approveCourseRequest({ progressId })
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
      setProcessingId(null)
    })
  }

  const handleReject = (progressId: number) => {
    const reason = window.prompt('거부 사유를 입력하세요 (선택사항):')
    if (reason === null) return // 취소

    setProcessingId(progressId)
    startTransition(async () => {
      const result = await rejectCourseRequest({ progressId, reason: reason || undefined })
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
      setProcessingId(null)
    })
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            과정 신청 대기
            <Badge variant="secondary">0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">대기 중인 과정 신청이 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5" />
          과정 신청 대기
          <Badge variant="default">{requests.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requests.map((request) => {
            const profile = request.profiles as any
            const creditAmount = request.creditAmount || 0
            const isProcessing = processingId === request.id

            return (
              <div
                key={request.id}
                className="border rounded-lg p-4 space-y-3 bg-slate-50"
              >
                {/* 사용자 및 과정 정보 */}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{profile?.name || '사용자'}</p>
                      <Badge variant="outline" className="text-xs">
                        {profile?.email}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      {request.courseTitle || request.course_level}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      신청일: {request.applied_at ? `${new Date(request.applied_at).toLocaleDateString('ko-KR')} ${new Date(request.applied_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : '미정'}
                    </p>
                  </div>

                  {/* 크레딧 정보 */}
                  {creditAmount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {creditAmount}C 지급
                    </Badge>
                  )}
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request.id)}
                    disabled={isPending}
                    className="flex-1 gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    승인
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(request.id)}
                    disabled={isPending}
                    className="flex-1 gap-2"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    거부
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
