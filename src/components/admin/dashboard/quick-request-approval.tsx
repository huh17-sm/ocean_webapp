'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Clock, ChevronDown, ChevronUp, Check, X, Users, Calendar, AlertTriangle } from 'lucide-react'
import { updateClassRequestStatus } from '@/app/classes/actions'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { CLASS_TYPES } from '@/lib/constants'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export interface PendingRequestData {
    id: string
    date: string
    time_slot: string
    type: 'theory' | 'pool' | 'training'
    location: string
    message?: string
    participants: number
    profiles: {
        name: string | null
        email: string | null
    } | null
    created_at: string
}

interface QuickRequestApprovalProps {
    requests: PendingRequestData[]
    totalPendingCount: number
}

export function QuickRequestApproval({ requests, totalPendingCount }: QuickRequestApprovalProps) {
    const router = useRouter()
    const { confirm } = useConfirm()
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [processingId, setProcessingId] = useState<string | null>(null)

    async function handleApprove(request: PendingRequestData) {
        const confirmed = await confirm({
            title: '수업 요청 승인',
            description: (
                <div className="space-y-2">
                    <p>이 요청을 승인하시겠습니까?</p>
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs text-left">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">요청자:</span>
                            <span>{request.profiles?.name || request.profiles?.email || '알 수 없음'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">유형:</span>
                            <span>{CLASS_TYPES[request.type as keyof typeof CLASS_TYPES] || request.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">날짜:</span>
                            <span>{format(new Date(request.date), 'yyyy년 M월 d일 (eee)', { locale: ko })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">시간:</span>
                            <span>{request.time_slot}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">장소:</span>
                            <span>{request.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">인원:</span>
                            <span>{request.participants}명</span>
                        </div>
                        {request.message && (
                            <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-slate-200">
                                <span className="font-semibold text-slate-700">메시지:</span>
                                <span className="text-slate-600">{request.message}</span>
                            </div>
                        )}
                    </div>
                    <p className="text-green-600 font-medium mt-2">
                        ✓ 승인 시 새로운 수업이 생성됩니다.
                    </p>
                </div>
            ),
            confirmText: '승인하기',
            cancelText: '취소',
        })

        if (!confirmed) return

        setProcessingId(request.id)
        startTransition(async () => {
            try {
                const result = await updateClassRequestStatus(request.id, 'approved')

                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success('요청이 승인되었습니다')
                    router.refresh()
                }
            } catch (error) {
                console.error('Approve error:', error)
                toast.error('승인 중 오류가 발생했습니다')
            } finally {
                setProcessingId(null)
            }
        })
    }

    async function handleReject(request: PendingRequestData) {
        const confirmed = await confirm({
            title: '수업 요청 거절',
            description: (
                <div className="space-y-2">
                    <p>이 요청을 거절하시겠습니까?</p>
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs text-left">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">요청자:</span>
                            <span>{request.profiles?.name || request.profiles?.email || '알 수 없음'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">날짜:</span>
                            <span>{format(new Date(request.date), 'yyyy년 M월 d일 (eee)', { locale: ko })}</span>
                        </div>
                    </div>
                    <p className="text-red-600 font-medium mt-2">
                        <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> 거절된 요청은 취소 처리됩니다.</span>
                    </p>
                </div>
            ),
            confirmText: '거절하기',
            cancelText: '취소',
            variant: 'destructive',
        })

        if (!confirmed) return

        setProcessingId(request.id)
        startTransition(async () => {
            try {
                const result = await updateClassRequestStatus(request.id, 'rejected')

                if (result.error) {
                    toast.error(result.error)
                } else {
                    toast.success('요청이 거절되었습니다')
                    router.refresh()
                }
            } catch (error) {
                console.error('Reject error:', error)
                toast.error('거절 중 오류가 발생했습니다')
            } finally {
                setProcessingId(null)
            }
        })
    }

    if (totalPendingCount === 0) {
        return null
    }

    return (
        <Card className="border-l-4 border-l-amber-500">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="p-4 pb-2">
                    <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            수업 요청
                            <Clock className="w-4 h-4 text-amber-600" />
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                                {totalPendingCount}건 대기
                            </Badge>
                            {isOpen ? (
                                <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                        </div>
                    </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                    <CardContent className="p-4 pt-0">
                        <div className="space-y-2">
                            {requests.length === 0 ? (
                                <div className="text-center py-4 text-sm text-slate-500">
                                    대기 중인 요청이 없습니다
                                </div>
                            ) : (
                                <>
                                    {requests.map((request) => (
                                        <div
                                            key={request.id}
                                            className="flex items-center justify-between p-3 border rounded-lg bg-white hover:border-amber-300 transition-colors"
                                        >
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm text-slate-900">
                                                        {request.profiles?.name || request.profiles?.email || '알 수 없음'}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {CLASS_TYPES[request.type as keyof typeof CLASS_TYPES] || request.type}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {format(new Date(request.date), 'M/d (eee)', { locale: ko })}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {request.time_slot}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {request.participants}명
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-1 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                                    onClick={() => handleApprove(request)}
                                                    disabled={isPending && processingId === request.id}
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    승인
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                                    onClick={() => handleReject(request)}
                                                    disabled={isPending && processingId === request.id}
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    거절
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {totalPendingCount > requests.length && (
                                        <div className="text-center py-2">
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="text-xs text-slate-500"
                                                onClick={() => router.push('/admin/classes/availability?tab=requests')}
                                            >
                                                +{totalPendingCount - requests.length}개 더보기
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    )
}
