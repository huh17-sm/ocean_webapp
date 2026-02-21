'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Clock, MapPin } from "lucide-react"

type ClassType = 'theory' | 'pool' | 'training'

interface ClassCardProps {
    id: string
    date: string
    time: string
    type: ClassType
    location: string | null
    maxCapacity: number
    currentEnrollment: number
    userCredits: number
    onReserve: (classId: string) => void
    isReserving: boolean
}

export function ClassCard({
    id,
    date,
    time,
    type,
    location,
    maxCapacity,
    currentEnrollment,
    userCredits,
    onReserve,
    isReserving
}: ClassCardProps) {
    const isFull = currentEnrollment >= maxCapacity
    const hasCredits = userCredits > 0

    const getTypeBadge = (type: ClassType) => {
        switch (type) {
            case 'theory':
                return <Badge variant="secondary">이론</Badge>
            case 'pool':
                return <Badge variant="outline" className="border-blue-500 text-blue-500">풀장</Badge>
            case 'training':
                return <Badge variant="outline" className="border-green-500 text-green-500">지상</Badge>
        }
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle>{date}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {time}
                        </CardDescription>
                    </div>
                    {getTypeBadge(type)}
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span>{location || '장소 미정'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-4 h-4" />
                    <span>{currentEnrollment} / {maxCapacity} 명 신청 중</span>
                </div>
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full"
                    disabled={isFull || !hasCredits || isReserving}
                    onClick={() => onReserve(id)}
                >
                    {isFull ? '마감됨' : !hasCredits ? '크레딧 부족' : '예약하기'}
                </Button>
            </CardFooter>
        </Card>
    )
}
