'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, ExternalLink, AlertCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cancelReservation } from '@/app/classes/actions'
import { useRouter } from 'next/navigation'
import { CLASS_TYPES, REFUND_POLICY, DEFAULT_CREDIT_COSTS } from '@/lib/constants'

interface UpcomingClassDialogProps {
  reservation: any
  isOpen: boolean
  onClose: () => void
}

export function UpcomingClassDialog({ reservation, isOpen, onClose }: UpcomingClassDialogProps) {
  const router = useRouter()
  const [isCancelling, setIsCancelling] = useState(false)

  if (!reservation || !reservation.classes) return null

  const classInfo = reservation.classes
  const classTypeLabel = CLASS_TYPES[classInfo.type as keyof typeof CLASS_TYPES] || classInfo.type

  // D-Day 계산 및 환불 예상액 확인
  const classDate = new Date(`${classInfo.date}T${classInfo.time}`)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const classDateOnly = new Date(classDate.getFullYear(), classDate.getMonth(), classDate.getDate())
  
  const diffTime = classDateOnly.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // 예약시 소모된 크레딧 (레거시면 디폴트값 사용)
  const creditCost = reservation.credit_cost || DEFAULT_CREDIT_COSTS[classInfo.type] || 1

  let expectedRefund = 0
  let refundMessage = ''
  let canCancel = true

  if (classDate < now) {
    canCancel = false
    refundMessage = '이미 지난 수업은 취소할 수 없습니다.'
  } else if (diffDays <= REFUND_POLICY.SAME_DAY.daysBefore) {
    canCancel = false
    refundMessage = REFUND_POLICY.SAME_DAY.message
  } else if (diffDays >= REFUND_POLICY.ONE_TO_THREE_DAYS.daysBeforeStart && diffDays <= REFUND_POLICY.ONE_TO_THREE_DAYS.daysBeforeEnd) {
    expectedRefund = Math.floor(creditCost * REFUND_POLICY.ONE_TO_THREE_DAYS.refundRate)
    refundMessage = REFUND_POLICY.ONE_TO_THREE_DAYS.message
  } else {
    expectedRefund = Math.floor(creditCost * REFUND_POLICY.FOUR_OR_MORE_DAYS.refundRate)
    refundMessage = REFUND_POLICY.FOUR_OR_MORE_DAYS.message
  }

  const handleCancelClick = async () => {
    if (!confirm(`정말 예약을 취소하시겠습니까?\n예상 환불 크레딧: ${expectedRefund}C\n\n${refundMessage}`)) {
      return
    }

    setIsCancelling(true)
    try {
      const result = await cancelReservation(reservation.id)
      if (result.success) {
        toast.success('수업 예약이 취소되었습니다.')
        router.refresh()
        onClose()
      } else {
        toast.error(result.error || '취소 중 오류가 발생했습니다.')
      }
    } catch (error) {
      toast.error('예약 취소 처리에 실패했습니다.')
    } finally {
      setIsCancelling(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md w-11/12 rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-0">
              {classTypeLabel}
            </Badge>
            <Badge variant="outline" className="text-slate-500">
              다가오는 수업
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold">
            {classInfo.title || '수업 상세 정보'}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            예약하신 수업의 상세 일정을 확인하고 취소할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3 text-slate-700">
              <Calendar className="w-5 h-5 text-slate-400" />
              <span className="font-medium">
                {new Date(classInfo.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-700">
              <Clock className="w-5 h-5 text-slate-400" />
              <span className="font-medium">{classInfo.time.substring(0, 5)} 시작</span>
            </div>
            <div className="flex items-start gap-3 text-slate-700">
              <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="font-medium text-slate-500 text-sm mb-1">장소 및 링크</span>
                <div className="font-medium text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {classInfo.location ? classInfo.location.split(/(https?:\/\/[^\s]+)/g).map((part: string, index: number) => {
                    if (part.match(/(https?:\/\/[^\s]+)/)) {
                      return (
                        <a
                          key={index}
                          href={part}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 break-all mx-1"
                        >
                          {part}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      )
                    }
                    return <span key={index}>{part}</span>
                  }) : '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800 text-sm">취소 및 환불 안내</h4>
                <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                  {refundMessage}
                </p>
                {canCancel && expectedRefund > 0 && (
                  <div className="mt-2 text-sm font-bold text-amber-900 bg-amber-100/50 inline-block px-2 py-1 rounded">
                    예상 환불 크레딧: <span className="text-blue-600">{expectedRefund}C</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2 pb-1">
          {canCancel ? (
            <Button
              variant="destructive"
              className="w-full sm:w-auto flex-1 font-semibold border border-red-200"
              onClick={handleCancelClick}
              disabled={isCancelling}
            >
              {isCancelling ? '처리 중...' : '예약 취소하기'}
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="w-full sm:w-auto flex-1 opacity-50 cursor-not-allowed"
              disabled
            >
              취소 불가 (당일 또는 지난 수업)
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full sm:w-auto flex-1"
            onClick={onClose}
            disabled={isCancelling}
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
