'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  MapPin,
  Users,
  Loader2,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { completeReservation } from '@/app/admin/actions'
import { ClassClosingManager } from '@/components/admin/class-closing-manager'

interface ClassDetailViewProps {
  classInfo: {
    id: string
    date: string
    time: string
    type: string
    location: string
    current_enrollment: number
    max_capacity: number
    status: string
    media_link: string | null
  }
  reservations: {
    id: string
    user_id: string
    status: string
    profiles: {
      name: string | null
      phone_number: string | null
      email: string
    }
  }[]
  existingDebriefings: {
    reservation_id: string
    performance: string | null
    improvement: string | null
    strengths: string | null
    next_goal: string | null
  }[]
  instructorId: string
}

export function ClassDetailView({
  classInfo,
  reservations: initialReservations,
  existingDebriefings,
  instructorId,
}: ClassDetailViewProps) {
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  const [reservations, setReservations] = useState(initialReservations)
  const [selectedReservations, setSelectedReservations] = useState<Set<string>>(
    new Set(initialReservations.filter((r) => r.status === 'attended').map((r) => r.id))
  )

  const handleToggleAttendance = (reservationId: string) => {
    setSelectedReservations((prev) => {
      const next = new Set(prev)
      if (next.has(reservationId)) {
        next.delete(reservationId)
      } else {
        next.add(reservationId)
      }
      return next
    })
  }

  const handleBulkAttendance = () => {
    startTransition(async () => {
      const promises = Array.from(selectedReservations).map((reservationId) => {
        const reservation = reservations.find((r) => r.id === reservationId)
        if (reservation && reservation.status === 'confirmed') {
          return completeReservation(reservationId)
        }
        return Promise.resolve({ success: true })
      })

      const results = await Promise.all(promises)
      const successCount = results.filter((r) => r.success).length

      if (successCount > 0) {
        toast({
          title: '출석 처리 완료',
          description: `${successCount}명의 출석이 처리되었습니다.`,
        })
        window.location.reload()
      }
    })
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl pb-20">
      {/* 수업 정보 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl mb-2">수업 상세</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{classInfo.type}</Badge>
                <Badge variant="secondary">{classInfo.status}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span>
                {new Date(classInfo.date).toLocaleDateString('ko-KR')} {classInfo.time}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-slate-500" />
              <span>{classInfo.location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-slate-500" />
              <span>
                {classInfo.current_enrollment}/{classInfo.max_capacity}명
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="participants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="participants">참석자 관리</TabsTrigger>
          <TabsTrigger value="closing">수업 마무리 (디브리핑)</TabsTrigger>
        </TabsList>

        <TabsContent value="participants">
          {/* 참석자 명단 */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>참석자 명단</CardTitle>
                <Button onClick={handleBulkAttendance} disabled={isPending || selectedReservations.size === 0}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    `일괄 출석 처리 (${selectedReservations.size})`
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reservations.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">등록된 학생이 없습니다.</p>
                ) : (
                  reservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={selectedReservations.has(reservation.id)}
                          onCheckedChange={() => handleToggleAttendance(reservation.id)}
                        />
                        {reservation.status === 'attended' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-400" />
                        )}
                        <div>
                          <p className="font-semibold">{reservation.profiles.name}</p>
                          <p className="text-sm text-slate-500">
                            {reservation.profiles.phone_number}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closing">
          <ClassClosingManager
            classInfo={classInfo}
            reservations={reservations}
            existingDebriefings={existingDebriefings}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
