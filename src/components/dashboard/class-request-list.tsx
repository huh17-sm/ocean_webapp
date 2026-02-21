'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Clock, MapPin, Calendar, Trash2 } from 'lucide-react'
import { deleteMyClassRequest, cancelMyClassRequest } from '@/app/classes/actions'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { CLASS_TYPES } from '@/lib/constants'

interface ClassRequest {
    id: string
    date: string
    time_slot: string
    type: 'theory' | 'pool' | 'ocean'
    location: string
    status: 'pending' | 'approved' | 'rejected' | 'cancelled'
    created_at: string
    message?: string
    admin_comment?: string
}

interface ClassRequestListProps {
    requests: ClassRequest[]
}

type TabType = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled'

export function ClassRequestList({ requests }: ClassRequestListProps) {
    const router = useRouter()
    const { confirm } = useConfirm()
    const [activeTab, setActiveTab] = useState<TabType>('all')
    const [deletingId, setDeletingId] = useState<string | null>(null)

    // 상태별 카운트 계산
    const counts = {
        all: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
        cancelled: requests.filter(r => r.status === 'cancelled').length,
    }

    // 필터링된 요청
    const filteredRequests = activeTab === 'all' 
        ? requests 
        : requests.filter(r => r.status === activeTab)
    
    // 삭제 핸들러
    const handleDeleteClick = async (request: ClassRequest) => {
        const confirmed = await confirm({
            title: '요청 삭제 확인',
            description: (
                <div className="space-y-2">
                    <p>이 요청을 삭제하시겠습니까?</p>
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs text-left">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">유형:</span>
                            <span>{CLASS_TYPES[request.type as keyof typeof CLASS_TYPES] || request.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">날짜:</span>
                            <span>{format(new Date(request.date), 'yyyy년 M월 d일', { locale: ko })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">시간:</span>
                            <span>{request.time_slot}</span>
                        </div>
                    </div>
                    <p className="text-red-600 font-medium mt-2">
                        ⚠️ 삭제된 요청은 복구할 수 없습니다.
                    </p>
                </div>
            ),
            confirmText: '삭제하기',
            cancelText: '취소',
            variant: 'destructive',
        })

        if (!confirmed) return
        
        setDeletingId(request.id)
        
        try {
            const result = await deleteMyClassRequest(request.id)
            
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('요청이 삭제되었습니다.')
                router.refresh()
            }
        } catch (error) {
            console.error('Delete error:', error)
            toast.error('삭제 중 오류가 발생했습니다.')
        } finally {
            setDeletingId(null)
        }
    }

    const getStatusBadge = (status: ClassRequest['status']) => {
        const variants = {
            pending: 'bg-amber-50 text-amber-700 border-amber-200',
            approved: 'bg-green-50 text-green-700 border-green-200',
            rejected: 'bg-red-50 text-red-700 border-red-200',
            cancelled: 'bg-slate-50 text-slate-700 border-slate-200'
        }

        const labels = {
            pending: '대기중',
            approved: '승인됨',
            rejected: '거절됨',
            cancelled: '취소됨'
        }

        return (
            <Badge variant="outline" className={`${variants[status]}`}>
                {labels[status]}
            </Badge>
        )
    }

    const getTypeLabel = (type: ClassRequest['type']) => {
        return CLASS_TYPES[type as keyof typeof CLASS_TYPES] || type
    }

    const tabs = [
        { id: 'all' as TabType, label: '전체', color: 'text-slate-700' },
        { id: 'pending' as TabType, label: '대기중', color: 'text-amber-600' },
        { id: 'approved' as TabType, label: '승인됨', color: 'text-green-600' },
        { id: 'rejected' as TabType, label: '거절됨', color: 'text-red-600' },
        { id: 'cancelled' as TabType, label: '취소됨', color: 'text-slate-600' },
    ]

    if (requests.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <p className="text-sm text-slate-400">요청한 수업이 없습니다.</p>
                <p className="text-xs text-slate-300 mt-1">원하는 날짜에 수업이 없다면 요청해보세요!</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* 탭 네비게이션 */}
            <div className="border-b border-slate-200">
                <div className="flex gap-1 overflow-x-auto pb-px scrollbar-hide">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        const count = counts[tab.id]
                        
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                                    border-b-2 transition-all duration-200
                                    ${isActive 
                                        ? `border-blue-500 ${tab.color}` 
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }
                                `}
                            >
                                <span>{tab.label}</span>
                                {count > 0 && (
                                    <span className={`
                                        px-2 py-0.5 text-xs rounded-full font-semibold
                                        ${isActive 
                                            ? 'bg-blue-100 text-blue-700' 
                                            : 'bg-slate-100 text-slate-600'
                                        }
                                    `}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* 요청 목록 */}
            {filteredRequests.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-400">
                        {activeTab === 'all' 
                            ? '요청한 수업이 없습니다.' 
                            : `${tabs.find(t => t.id === activeTab)?.label} 상태의 요청이 없습니다.`
                        }
                    </p>
                    {activeTab === 'all' && (
                        <p className="text-xs text-slate-300 mt-1">원하는 날짜에 수업이 없다면 요청해보세요!</p>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRequests.map((request) => (
                        <Card key={request.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-800">{getTypeLabel(request.type)}</span>
                                        {getStatusBadge(request.status)}
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        {format(new Date(request.created_at), 'MM/dd HH:mm', { locale: ko })}
                                    </span>
                                </div>
                                
                                <div className="space-y-1.5 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span>{format(new Date(request.date), 'yyyy년 M월 d일 (EEE)', { locale: ko })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <span>{request.time_slot}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-slate-400" />
                                        <span>{request.location}</span>
                                    </div>
                                </div>

                                {request.status === 'pending' && (
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-xs text-slate-500">
                                                    ⏳ 관리자가 검토 중입니다. 승인되면 수업이 자동으로 개설됩니다.
                                                </p>
                                                {request.admin_comment && (
                                                    <div className="mt-2 p-2 bg-blue-50/50 rounded border border-blue-100">
                                                        <p className="text-[11px] font-semibold text-blue-700 mb-0.5 italic">💡 관리자 안내: {request.admin_comment}</p>
                                                        <p className="text-[10px] text-slate-500 leading-tight">상담을 통해 조율된 내용으로 요청 정보가 수정되었습니다.</p>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={async () => {
                                                    const confirmed = await confirm({
                                                        title: '요청 취소',
                                                        description: '승인 대기 중인 수업 요청을 취소하시겠습니까?',
                                                        confirmText: '요청 취소',
                                                        cancelText: '닫기',
                                                        variant: 'destructive',
                                                    })

                                                    if (!confirmed) return

                                                    setDeletingId(request.id) // Reuse deleting state for loading spinner
                                                    try {
                                                        const result = await cancelMyClassRequest(request.id)
                                                        if (result.error) {
                                                            toast.error(result.error)
                                                        } else {
                                                            toast.success('요청이 취소되었습니다.')
                                                            router.refresh()
                                                        }
                                                    } catch (e) {
                                                        toast.error('오류가 발생했습니다.')
                                                    } finally {
                                                        setDeletingId(null)
                                                    }
                                                }}
                                                disabled={deletingId === request.id}
                                                className="h-7 px-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                                            >
                                                {deletingId === request.id ? '취소 중...' : '요청 취소'}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {request.status === 'approved' && (
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-xs text-green-600">
                                                    ✅ 승인되었습니다! 수업이 개설되었으니 예약 가능합니다.
                                                </p>
                                                {request.admin_comment && (
                                                    <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100">
                                                        <p className="text-[11px] font-semibold text-slate-700 mb-0.5">안내: {request.admin_comment}</p>
                                                        <p className="text-[10px] text-slate-500 leading-tight">관리자와 협의된 내용으로 승인 처리되었습니다.</p>
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteClick(request)}
                                                disabled={deletingId === request.id}
                                                className="h-7 px-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50"
                                            >
                                                {deletingId === request.id ? (
                                                    <span className="text-xs">삭제중...</span>
                                                ) : (
                                                    <>
                                                        <Trash2 className="w-3 h-3 mr-1" />
                                                        삭제
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {request.status === 'rejected' && (
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-xs text-red-600">
                                                    ❌ 요청이 거절되었습니다. 다른 날짜나 시간으로 다시 요청해보세요.
                                                </p>
                                                {request.admin_comment && (
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        사유: {request.admin_comment}
                                                    </p>
                                                )}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteClick(request)}
                                                disabled={deletingId === request.id}
                                                className="h-7 px-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                                            >
                                                {deletingId === request.id ? (
                                                    <span className="text-xs">삭제중...</span>
                                                ) : (
                                                    <>
                                                        <Trash2 className="w-3 h-3 mr-1" />
                                                        삭제
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                {request.status === 'cancelled' && (
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <div className="flex items-start justify-between gap-2">
                                            {request.admin_comment === '사용자가 직접 취소함' ? (
                                                <p className="text-xs text-slate-500 flex-1">
                                                    🗑️ 사용자가 직접 요청을 취소했습니다.
                                                </p>
                                            ) : (
                                                <p className="text-xs text-red-600/80 flex-1">
                                                    🚫 요청이 취소되었습니다. {request.admin_comment ? `사유: ${request.admin_comment}` : '관리자가 수업을 취소했습니다.'}
                                                </p>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteClick(request)}
                                                disabled={deletingId === request.id}
                                                className="h-7 px-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                                            >
                                                {deletingId === request.id ? (
                                                    <span className="text-xs">삭제중...</span>
                                                ) : (
                                                    <>
                                                        <Trash2 className="w-3 h-3 mr-1" />
                                                        삭제
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
