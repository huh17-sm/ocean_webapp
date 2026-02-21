'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cancelReservation, archiveReservation } from "@/app/classes/actions"
import { useState } from "react"
import { Loader2, MessageSquare, ExternalLink, Archive } from "lucide-react"

import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"
import { useRouter } from "next/navigation"

import { ReservationWithClass } from "@/types"

export function ReservationList({ reservations }: { reservations: ReservationWithClass[] }) {
    const router = useRouter()
    const { confirm } = useConfirm()
    const [cancelingId, setCancelingId] = useState<string | null>(null)
    const [archivingId, setArchivingId] = useState<string | null>(null)
    const [cancelledIds, setCancelledIds] = useState<Set<string>>(new Set())

    const handleCancel = async (id: string) => {
        if (cancelledIds.has(id) || cancelingId === id) return

        const confirmed = await confirm({
            title: "예약 취소",
            description: "정말 예약을 취소하시겠습니까? 크레딧이 환불됩니다.",
            confirmText: "취소하기",
            variant: "destructive",
        })

        if (!confirmed) return

        setCancelingId(id)
        const result = await cancelReservation(id)
        setCancelingId(null)

        if (result.error) {
            toast.error(result.error)
        } else {
            setCancelledIds(prev => new Set(prev).add(id))
            toast.success("예약이 취소되었습니다.")
            router.refresh()
        }
    }

    const handleArchive = async (id: string) => {
        if (archivingId === id) return

        setArchivingId(id)
        const result = await archiveReservation(id)
        setArchivingId(null)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("예약이 보관되었습니다.")
            router.refresh()
        }
    }

    // is_archived가 true인 항목 제외
    const activeReservations = reservations.filter(res => !res.is_archived)

    if (activeReservations.length === 0) {
        return <div className="text-center py-10 text-slate-500">예약된 수업이 없습니다.</div>
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 예정된 수업과 지난 수업/취소 내역으로 분리
    const upcomingReservations = activeReservations.filter(res => {
        if (!res.classes) return false
        const classDate = new Date(res.classes.date)
        classDate.setHours(0, 0, 0, 0)
        return classDate >= today && res.status === 'confirmed'
    })

    const pastReservations = activeReservations.filter(res => {
        if (!res.classes) return false
        const classDate = new Date(res.classes.date)
        classDate.setHours(0, 0, 0, 0)
        return classDate < today || res.status === 'cancelled'
    })

    // 예약 취소 가능 여부 확인 함수
    const canCancelReservation = (res: ReservationWithClass) => {
        if (!res.classes) return false

        // 출석 완료된 예약은 취소 불가
        if (res.status === 'attended') return false

        // 수업 날짜가 지났으면 취소 불가
        const classDate = new Date(res.classes.date + "T23:59:59")
        const now = new Date()
        if (classDate < now) return false

        // 피드백(디브리핑)이 있으면 취소 불가
        if (res.debriefing) return false

        // 이중 환불 방지
        if (res.credit_refunded) return false

        return true
    }

    // 예약 카드 렌더링 함수
    const renderReservationCard = (res: ReservationWithClass, isPastTab: boolean) => {
        const cls = res.classes
        if (!cls) return null

        const classDate = new Date(cls.date)
        classDate.setHours(0, 0, 0, 0)
        const isPast = classDate < today

        // 디브리핑이나 매체 링크가 있으면 항상 표시
        const hasFeedback = res.debriefing || cls.media_link
        const canCancel = canCancelReservation(res)

        return (
            <Card key={res.id} className="overflow-hidden border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 bg-slate-50/30">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">
                                    {format(new Date(cls.date), 'M월 d일 (EEE)', { locale: ko })} {cls.time.slice(0, 5)}
                                </CardTitle>
                            </div>
                            <CardDescription className="flex items-center gap-1">
                                {cls.location ?? '장소 미정'}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {isPast && res.status === 'confirmed' && (
                                <Badge variant="secondary" className="text-[10px] font-bold">완료</Badge>
                            )}
                            <Badge
                                variant={res.status === 'confirmed' ? 'default' : 'destructive'}
                                className={res.status === 'confirmed' ? 'bg-blue-600' : ''}
                            >
                                {res.status === 'confirmed' ? '예약확정' : '취소됨'}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                            {cls.type === 'theory' ? '이론 수업' : cls.type === 'pool' ? '풀장 실습' : '트레이닝'}
                        </span>
                        <div className="flex gap-2">
                            {/* 예정된 수업: 취소 가능 여부에 따라 취소 버튼 표시 */}
                            {!isPastTab && res.status === 'confirmed' && canCancel && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8"
                                    disabled={cancelingId === res.id || cancelledIds.has(res.id)}
                                    onClick={() => handleCancel(res.id)}
                                >
                                    {cancelingId === res.id && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                    예약 취소
                                </Button>
                            )}
                            {/* 지난 수업: 보관하기 버튼 표시 */}
                            {isPastTab && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-50 h-8"
                                    disabled={archivingId === res.id}
                                    onClick={() => handleArchive(res.id)}
                                >
                                    {archivingId === res.id ? (
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    ) : (
                                        <Archive className="mr-2 h-3 w-3" />
                                    )}
                                    보관하기
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* 디브리핑 & 미디어 링크 섹션 */}
                    {hasFeedback && (
                        <div className="space-y-3 pt-3 border-t border-slate-100">
                            {res.debriefing && (
                                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <div className="bg-blue-600 rounded-full p-1">
                                            <MessageSquare className="w-3 h-3 text-white" />
                                        </div>
                                        <span className="text-xs font-bold text-blue-800">강사님 피드백</span>
                                        {res.debriefing_at && (
                                            <span className="text-[10px] text-blue-400 ml-auto">
                                                {format(new Date(res.debriefing_at), 'M.d HH:mm', { locale: ko })}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                        {res.debriefing}
                                    </p>
                                </div>
                            )}

                            {cls.media_link && (
                                <div className="flex gap-2">
                                    <a
                                        href={cls.media_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full"
                                    >
                                        <Button variant="outline" size="sm" className="w-full h-10 text-blue-600 border-blue-200 hover:bg-blue-50 font-semibold shadow-sm">
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            수업 사진 및 영상 확인하기
                                        </Button>
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        )
    }

    return (
        <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upcoming">
                    예정된 수업 ({upcomingReservations.length})
                </TabsTrigger>
                <TabsTrigger value="past">
                    지난 수업/취소 내역 ({pastReservations.length})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
                {upcomingReservations.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">예정된 수업이 없습니다.</div>
                ) : (
                    upcomingReservations.map((res) => renderReservationCard(res, false))
                )}
            </TabsContent>

            <TabsContent value="past" className="space-y-4">
                {pastReservations.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">지난 수업이 없습니다.</div>
                ) : (
                    pastReservations.map((res) => renderReservationCard(res, true))
                )}
            </TabsContent>
        </Tabs>
    )
}
