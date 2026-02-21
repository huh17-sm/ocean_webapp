'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ArrowLeft, Calendar, Clock, MapPin, X, Trash2 } from 'lucide-react'
import { formatCredits } from '@/lib/credit-constants'
import { toast } from 'sonner'
import { cancelReservation } from '@/app/classes/actions'
import { useRouter } from 'next/navigation'

interface ReservationsViewProps {
  reservations: any[]
}

export function ReservationsView({ reservations }: ReservationsViewProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all')
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const filteredReservations = reservations.filter((r) => {
    if (filter === 'all') return true
    return r.status === filter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default">예정</Badge>
      case 'completed':
        return <Badge variant="secondary">완료</Badge>
      case 'cancelled':
        return <Badge variant="destructive">취소</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleCancel = async (reservationId: string) => {
    if (!confirm('정말 이 예약을 취소하시겠습니까?')) return

    setIsLoading(reservationId)
    try {
      const result = await cancelReservation(reservationId)
      if (result.success) {
        toast.success('예약이 취소되었습니다')
        router.refresh()
      } else {
        toast.error(result.error || '예약 취소에 실패했습니다')
      }
    } catch (error) {
      toast.error('예약 취소 중 오류가 발생했습니다')
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-4xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">📅 내 예약 현황</h1>
          <p className="text-slate-500 mt-1">수업 예약 내역을 확인하고 관리하세요</p>
        </div>
      </div>

      {/* 필터 탭 */}
      <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="confirmed">예정</TabsTrigger>
          <TabsTrigger value="completed">완료</TabsTrigger>
          <TabsTrigger value="cancelled">취소</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {filteredReservations.length === 0 ? (
            <Card className="py-12">
              <CardContent className="text-center">
                <Calendar className="h-16 w-16 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500 mb-4">예약 내역이 없습니다</p>
                <Link href="/classes">
                  <Button>수업 예약하러 가기</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReservations.map((reservation) => (
                <Card key={reservation.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    {/* 상태 및 날짜 */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(reservation.status)}
                        <Badge variant="outline">{reservation.classes?.type}</Badge>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        {new Date(reservation.created_at).toLocaleDateString('ko-KR')}
                      </div>
                    </div>

                    {/* 수업 정보 */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">
                          {new Date(reservation.classes?.date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <Clock className="h-4 w-4" />
                        <span>{reservation.classes?.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <MapPin className="h-4 w-4" />
                        <span>{reservation.classes?.location}</span>
                      </div>
                    </div>

                    {/* 예약 메모 */}
                    {reservation.note && (
                      <div className="bg-slate-50 p-3 rounded-lg mb-4">
                        <p className="text-sm text-slate-600">
                          <span className="font-semibold">메모: </span>
                          {reservation.note}
                        </p>
                      </div>
                    )}

                    {/* 크레딧 정보 */}
                    <div className="flex items-center justify-between text-sm border-t pt-3">
                      <span className="text-slate-500">사용 크레딧</span>
                      <span className="font-semibold text-slate-900">
                        {formatCredits(reservation.credit_cost || 0)}
                      </span>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex gap-2 mt-4">
                      {reservation.status === 'confirmed' &&
                        new Date(reservation.classes?.date) >= new Date() && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="w-full"
                            onClick={() => handleCancel(reservation.id)}
                            disabled={isLoading === reservation.id}
                          >
                            <X className="h-4 w-4 mr-1" />
                            {isLoading === reservation.id ? '취소 중...' : '예약 취소'}
                          </Button>
                        )}

                      {reservation.status === 'completed' && (
                        <>
                          <Link href={`/dashboard/progress`} className="flex-1">
                            <Button variant="outline" size="sm" className="w-full">
                              디브리핑 보기
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
