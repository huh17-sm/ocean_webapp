'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Award, ChevronDown, ChevronUp, Check, X, Calendar, AlertTriangle } from 'lucide-react'
import { approveCertificate, rejectCertificate } from '@/app/admin/actions/certificates-v2'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export interface PendingCertificateData {
    id: number
    level: string
    created_at: string
    profiles: {
        name: string | null
        email: string | null
    } | null
}

interface QuickCertActionsProps {
    certificates: PendingCertificateData[]
    totalPendingCount: number
}

export function QuickCertActions({ certificates, totalPendingCount }: QuickCertActionsProps) {
    const router = useRouter()
    const { confirm } = useConfirm()
    const [isOpen, setIsOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const [processingId, setProcessingId] = useState<number | null>(null)

    async function handleApprove(cert: PendingCertificateData) {
        const confirmed = await confirm({
            title: '자격증 승인',
            description: (
                <div className="space-y-2">
                    <p>이 자격증 신청을 승인하시겠습니까?</p>
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs text-left">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">신청자:</span>
                            <span>{cert.profiles?.name || cert.profiles?.email || '알 수 없음'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">레벨:</span>
                            <span>{cert.level}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">신청일:</span>
                            <span>{format(new Date(cert.created_at), 'yyyy년 M월 d일', { locale: ko })}</span>
                        </div>
                    </div>
                    <p className="text-green-600 font-medium mt-2">
                        ✓ 승인 후 자격증을 발급할 수 있습니다.
                    </p>
                </div>
            ),
            confirmText: '승인하기',
            cancelText: '취소',
        })

        if (!confirmed) return

        setProcessingId(cert.id)
        startTransition(async () => {
            try {
                const result = await approveCertificate({
                    certificate_id: cert.id,
                })

                if (result.success) {
                    toast.success(result.message || '자격증이 승인되었습니다')
                    router.refresh()
                } else {
                    toast.error(result.message || '승인 중 오류가 발생했습니다')
                }
            } catch (error) {
                console.error('Approve error:', error)
                toast.error('승인 중 오류가 발생했습니다')
            } finally {
                setProcessingId(null)
            }
        })
    }

    async function handleReject(cert: PendingCertificateData) {
        const confirmed = await confirm({
            title: '자격증 거부',
            description: (
                <div className="space-y-2">
                    <p>이 자격증 신청을 거부하시겠습니까?</p>
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs text-left">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">신청자:</span>
                            <span>{cert.profiles?.name || cert.profiles?.email || '알 수 없음'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-700">레벨:</span>
                            <span>{cert.level}</span>
                        </div>
                    </div>
                    <p className="text-red-600 font-medium mt-2">
                        <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> 거부된 신청은 취소 처리됩니다.</span>
                    </p>
                </div>
            ),
            confirmText: '거부하기',
            cancelText: '취소',
            variant: 'destructive',
        })

        if (!confirmed) return

        setProcessingId(cert.id)
        startTransition(async () => {
            try {
                const result = await rejectCertificate({
                    certificate_id: cert.id,
                    rejection_reason: '관리자에 의해 거부됨',
                })

                if (result.success) {
                    toast.success(result.message || '자격증이 거부되었습니다')
                    router.refresh()
                } else {
                    toast.error(result.message || '거부 중 오류가 발생했습니다')
                }
            } catch (error) {
                console.error('Reject error:', error)
                toast.error('거부 중 오류가 발생했습니다')
            } finally {
                setProcessingId(null)
            }
        })
    }

    if (totalPendingCount === 0) {
        return null
    }

    return (
        <Card className="border-l-4 border-l-purple-500">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="p-4 pb-2">
                    <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
                        <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                            자격증 신청
                            <Award className="w-4 h-4 text-purple-600" />
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-purple-100 text-purple-700">
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
                            {certificates.length === 0 ? (
                                <div className="text-center py-4 text-sm text-slate-500">
                                    대기 중인 신청이 없습니다
                                </div>
                            ) : (
                                <>
                                    {certificates.map((cert) => (
                                        <div
                                            key={cert.id}
                                            className="flex items-center justify-between p-3 border rounded-lg bg-white hover:border-purple-300 transition-colors"
                                        >
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm text-slate-900">
                                                        {cert.profiles?.name || cert.profiles?.email || '알 수 없음'}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                                                        {cert.level}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {format(new Date(cert.created_at), 'M/d (eee)', { locale: ko })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-1 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                                                    onClick={() => handleApprove(cert)}
                                                    disabled={isPending && processingId === cert.id}
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    승인
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                                    onClick={() => handleReject(cert)}
                                                    disabled={isPending && processingId === cert.id}
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    거부
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {totalPendingCount > certificates.length && (
                                        <div className="text-center py-2">
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="text-xs text-slate-500"
                                                onClick={() => router.push('/admin/certificates-v2')}
                                            >
                                                +{totalPendingCount - certificates.length}개 더보기
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
