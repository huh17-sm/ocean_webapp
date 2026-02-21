'use client'

import React, { useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Clock, MapPin, Users, Plus, Calendar as CalendarIcon, Send, ChevronLeft, ChevronRight, Link as LinkIcon } from "lucide-react"
import { format, isSameDay, parseISO, startOfToday, addMonths, subMonths } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { reserveClass, requestClass } from '@/app/classes/actions'
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"
import { Pool } from '@/types'
import { getPoolTimeSlots, isPoolHoliday } from '@/utils/pool-logic'
import { isRedDay } from '@/lib/holidays'
import { CLASS_TYPES, CLASS_COLORS, CLASS_BG_COLORS, DEFAULT_CREDIT_COSTS, ClassTypeSetting, CREDIT_UNIT } from '@/lib/constants'



interface ClassData {
    id: string
    date: string
    time: string
    type: 'theory' | 'pool' | 'training'
    location: string
    max_capacity: number
    current_enrollment: number
    title?: string
}

interface AvailabilityBlock {
    id: string
    start_date: string
    end_date: string
    reason?: string
}

import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"

export default function ClassCalendarView({
    initialClasses,
    userCredits,
    blockedPeriods = [],
    pools = [],
    classTypeSettings = []
}: {
    initialClasses: ClassData[],
    userCredits: number,
    blockedPeriods?: AvailabilityBlock[],
    pools?: Pool[],
    classTypeSettings?: ClassTypeSetting[]
}) {
    const { confirm } = useConfirm()

    const [date, setDate] = useState<Date | undefined>(new Date())
    const [viewMonth, setViewMonth] = useState<Date>(new Date())
    const [isReserving, setIsReserving] = useState<string | null>(null)
    const [isRequesting, setIsRequesting] = useState(false)
    const [requestOpen, setRequestOpen] = useState(false)
    const router = useRouter()

    // Request form state
    const [reqType, setReqType] = useState('pool')
    const [reqTime, setReqTime] = useState('')
    const [reqLocation, setReqLocation] = useState('')
    const [reqPoolId, setReqPoolId] = useState('')
    const [reqParticipants, setReqParticipants] = useState('1')
    const [reqInstructions, setReqInstructions] = useState('')
    
    // Theory specific
    const [theoryType, setTheoryType] = useState<'online' | 'offline'>('offline')

    const classesByDate = useMemo(() => {
        const selectedDateStr = date ? format(date, 'yyyy-MM-dd') : null
        return initialClasses.filter(c => c.date === selectedDateStr)
    }, [date, initialClasses])

    const isClassType = (d: Date, type: string) => {
        const dStr = format(d, 'yyyy-MM-dd')
        return initialClasses.some(c => c.date === dStr && c.type === type)
    }

    const isDateBlocked = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        return blockedPeriods.some(block => 
            dayStr >= block.start_date && dayStr <= block.end_date
        )
    }

    const hasClasses = (day: Date) => {
        const dayStr = format(day, 'yyyy-MM-dd')
        return initialClasses.some(cls => cls.date === dayStr)
    }

    const getDayStyle = (day: Date) => {
        const hasClass = hasClasses(day)
        const blocked = isDateBlocked(day)
        const isRed = isRedDay(day)

        if (hasClass) return isRed ? "text-slate-900 font-bold" : "text-slate-900 font-bold" 
        if (blocked) return "text-slate-300 pointer-events-none" 
        if (isRed) return "text-red-500 font-bold"
        return "text-slate-900" 
    }

    // Helper to get credit cost
    const getCreditCost = (type: string) => {
        const setting = classTypeSettings.find(s => s.type === type)
        return setting ? setting.credit_cost : (DEFAULT_CREDIT_COSTS[type] ?? 1)
    }

    const handleReserve = async (classId: string, classType: string) => {
        const creditCost = getCreditCost(classType)
        
        // 크레딧 부족 체크
        if (userCredits < creditCost) {
            toast.error(`크레딧이 부족합니다. (필요: ${creditCost}, 보유: ${userCredits})`)
            return
        }

        const confirmed = await confirm({
            title: "수업 예약",
            description: `예약하시겠습니까? 크레딧 ${creditCost}회가 차감됩니다.`,
            confirmText: "예약하기",
            variant: "default",
        })

        if (!confirmed) return

        setIsReserving(classId)
        const result = await reserveClass(classId)
        setIsReserving(null)
        if (result.error) toast.error(result.error)
        else {
            toast.success("예약이 완료되었습니다!")
            router.refresh()
        }
    }

    const handleRequest = async () => {
        if (!date) return
        setIsRequesting(true)
        
        let finalLocation = reqLocation
        if (reqType === 'theory') {
             if (theoryType === 'online') {
                finalLocation = `Online`
             }
             // If offline, use reqLocation
        } else if ((reqType === 'pool' || reqType === 'training') && reqPoolId) {
            const pool = pools.find(p => p.id === reqPoolId)
            if (pool) finalLocation = pool.name
        }

        const result = await requestClass({
            date: format(date, 'yyyy-MM-dd'),
            type: reqType,
            timeSlot: reqTime,
            location: finalLocation,
            participants: parseInt(reqParticipants) || 1,
            user_instructions: reqInstructions
        })
        setIsRequesting(false)
        if (result.error) toast.error(result.error)
        else {
            toast.success('수업 개설 요청이 전송되었습니다. 관리자 승인 후 개설됩니다.')
            setRequestOpen(false)
            router.refresh()
        }
    }

    const getTypeLabel = (type: string) => {
        return CLASS_TYPES[type as keyof typeof CLASS_TYPES] || type
    }

    // Dynamic Time Slots for Request
    const availableRequestTimeSlots = useMemo(() => {
        if ((reqType === 'pool' || reqType === 'training') && reqPoolId && date) {
            const pool = pools.find(p => p.id === reqPoolId)
            if (!pool) return []
            
            // Check holiday first?
            if (isPoolHoliday(pool, date)) return []
            
            return getPoolTimeSlots(pool, date)
        }
        return [] // For theory, logic might be different or manual input
    }, [reqType, reqPoolId, date, pools])

    const isRequestHoliday = useMemo(() => {
        if ((reqType === 'pool' || reqType === 'training') && reqPoolId && date) {
             const pool = pools.find(p => p.id === reqPoolId)
             if (pool) return isPoolHoliday(pool, date)
        }
        return false
    }, [reqType, reqPoolId, date, pools])


    return (
        <div className="max-w-5xl mx-auto p-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid lg:grid-cols-[1.2fr,1fr] gap-8 items-start">
                <Card className="border-none shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl">
                    <CardHeader className="pb-0 pt-8 px-8">
                        <div className="flex flex-col space-y-2">
                             <CardTitle className="text-3xl font-black bg-linear-to-br from-blue-700 to-cyan-500 bg-clip-text text-transparent">
                                수업 예약
                            </CardTitle>
                            <CardDescription className="text-base font-medium text-slate-500">
                                원하는 날짜를 선택하여 다이빙 일정을 계획하세요.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        {/* Custom Header with Premium Navigation */}
                        <div className="flex items-center justify-between px-2 mb-8">
                           <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => setViewMonth(prev => subMonths(prev, 1))}
                                className="h-10 w-10 sorted-full border-slate-200 hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition-all rounded-full"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <div className="text-2xl font-bold text-slate-800 tracking-tight flex items-baseline gap-1">
                                {format(viewMonth, 'yyyy', { locale: ko })}
                                <span className="text-blue-600">{format(viewMonth, 'MM월', { locale: ko })}</span>
                            </div>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => setViewMonth(prev => addMonths(prev, 1))}
                                className="h-10 w-10 sorted-full border-slate-200 hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition-all rounded-full"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>

                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            month={viewMonth}
                            onMonthChange={setViewMonth}
                            locale={ko}
                            weekStartsOn={0}
                            className="w-full max-w-full"
                            disabled={(date) => {
                                const dStr = format(date, 'yyyy-MM-dd')
                                return blockedPeriods.some(b => dStr >= b.start_date && dStr <= b.end_date)
                            }}
                            components={{
                                DayButton: (props) => {
                                    const { day } = props
                                    const date = day.date
                                    const dStr = format(date, 'yyyy-MM-dd')
                                    const dayClasses = initialClasses.filter(c => c.date === dStr)
                                    const styleClass = getDayStyle(date)
                                      
                                    // Block Logic
                                    const block = blockedPeriods.find(b => dStr >= b.start_date && dStr <= b.end_date)
                                    let blockStyle = ""
                                    let blockContent = null
                                    
                                    if (block) {
                                        // Base block style - No background, just gray text
                                        blockStyle = "text-slate-300 w-full h-full aspect-square disabled:opacity-100" 

                                        // Center Text Calculation
                                        const start = parseISO(block.start_date)
                                        const end = parseISO(block.end_date)
                                        const diffTime = Math.abs(end.getTime() - start.getTime());
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                                        const midIndex = Math.floor(diffDays / 2)
                                        const middleDateStr = format(new Date(start.getTime() + midIndex * (1000 * 60 * 60 * 24)), 'yyyy-MM-dd')
                                        
                                        // If current date is same as middle date, show reason pill
                                        if (dStr === middleDateStr) {
                                            blockContent = (
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[200px] flex justify-center pointer-events-none">
                                                    <span className="text-[10px] font-bold text-slate-500 bg-white/90 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap overflow-hidden border border-slate-200/50">
                                                        {block.reason}
                                                    </span>
                                                </div>
                                            )
                                        }
                                    }

                                    return (
                                        <CalendarDayButton 
                                            {...props} 
                                            dayClasses={!block ? dayClasses : []} // Hide dots if blocked (though typically no classes if blocked)
                                            className={cn(
                                                props.className, 
                                                block ? blockStyle : styleClass, 
                                                !block && "hover:bg-blue-50/80 transition-all duration-300"
                                            )}
                                        >
                                            {block && blockContent}
                                        </CalendarDayButton>
                                    )
                                }
                            }}
                            labels={{
                                labelDay: (date) => format(date, 'yyyy년 M월 d일', { locale: ko }),
                            }}
                            formatters={{
                                formatCaption: (date) => format(date, 'yyyy년 M월', { locale: ko }),
                                formatDay: (date) => format(date, 'd'),
                                formatWeekdayName: (date) => format(date, 'E', { locale: ko }),
                            }}
                        />
                        
                        <div className="flex justify-center mt-8 gap-6">
                             {(['pool', 'theory', 'training'] as const).map((type) => (
                                <div key={type} className="flex items-center gap-2 group cursor-default">
                                    <div className={cn(
                                        "w-3 h-3 rounded-full shadow-sm ring-2 ring-white",
                                        CLASS_COLORS[type] || "bg-slate-400"
                                    )}></div>
                                    <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">
                                        {CLASS_TYPES[type]}
                                    </span>
                                </div>
                             ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Class List or Request */}
                <div className="lg:col-span-1 space-y-6 animate-in slide-in-from-right-4 duration-700 delay-150">
                    <div className="flex justify-between items-end mb-2 px-2">
                        <div className="flex flex-col">
                            <span className="text-smfont-medium text-slate-400 mb-1">선택된 날짜</span>
                            <h3 className="text-2xl font-bold text-slate-800">
                                {date ? format(date, 'M월 d일 (eee)', { locale: ko }) : '날짜를 선택해주세요'}
                            </h3>
                        </div>
                        <Badge variant="secondary" className="bg-white hover:bg-white text-slate-600 border border-slate-100 shadow-sm px-3 py-1 text-sm">
                            {classesByDate.length}개의 일정
                        </Badge>
                    </div>

                    {classesByDate.length > 0 ? (
                        <div className="space-y-4">
                            {classesByDate.map((cls) => (
                                <Card key={cls.id} className="overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 group ring-1 ring-slate-100">
                                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-linear-to-b from-blue-400 to-blue-600 group-hover:w-2 transition-all"></div>
                                    <div className="p-5 pl-7 flex flex-col gap-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge variant="outline" className={cn(
                                                        "border-0 px-2 py-0.5 font-bold uppercase tracking-wider text-[10px]",
                                                        CLASS_BG_COLORS[cls.type as keyof typeof CLASS_BG_COLORS] || CLASS_BG_COLORS.default
                                                    )}>
                                                        {CLASS_TYPES[cls.type as keyof typeof CLASS_TYPES] || cls.type.toUpperCase()}
                                                    </Badge>
                                                </div>
                                                <span className="font-bold text-lg text-slate-900 leading-tight">
                                                    {cls.title || getTypeLabel(cls.type)}
                                                </span>
                                            </div>
                                             <Button
                                                onClick={() => handleReserve(cls.id, cls.type)}
                                                disabled={isReserving === cls.id || (cls.current_enrollment >= cls.max_capacity)}
                                                size="sm"
                                                className={cn(
                                                    "rounded-full px-5 font-semibold shadow-lg shadow-blue-200/50",
                                                    isReserving === cls.id ? "bg-slate-100 text-slate-400" :
                                                    cls.current_enrollment >= cls.max_capacity ? "bg-slate-100 text-slate-400" :
                                                    "bg-blue-600 hover:bg-blue-700 text-white"
                                                )}
                                            >
                                                {isReserving === cls.id ? '처리 중' :
                                                    cls.current_enrollment >= cls.max_capacity ? '마감됨' : '예약'}
                                            </Button>
                                        </div>
                                        
                                        <div className="flex items-center gap-4 text-sm text-slate-500 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <Clock className="w-4 h-4 text-blue-400" />
                                                {cls.time.slice(0, 5)}
                                            </div>
                                            <div className="w-px h-3 bg-slate-300"></div>
                                            <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
                                                {(() => {
                                                    const urlMatch = cls.location.match(/(https?:\/\/[^\s]+)/);
                                                    const locationUrl = urlMatch ? urlMatch[0] : null;
                                                    
                                                    if (locationUrl) {
                                                        return (
                                                            <a 
                                                                href={locationUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1.5 hover:text-blue-600 hover:underline transition-colors min-w-0"
                                                                onClick={(e) => e.stopPropagation()}
                                                                title={cls.location}
                                                            >
                                                                <LinkIcon className="w-4 h-4 text-blue-400 shrink-0" />
                                                                <span className="truncate">{cls.location}</span>
                                                            </a>
                                                        );
                                                    }
                                                    return (
                                                        <>
                                                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                                                            <span className="truncate" title={cls.location}>{cls.location}</span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                            <div className="w-px h-3 bg-slate-300 ml-auto"></div>
                                            <div className="flex items-center gap-1.5 ml-auto">
                                                <Users className="w-4 h-4 text-slate-400" />
                                                <span className={cn(
                                                    cls.current_enrollment >= cls.max_capacity ? "text-red-500 font-bold" : "text-slate-600"
                                                )}>
                                                    {cls.current_enrollment}/{cls.max_capacity}
                                                </span>
                                            </div>
                                            <div className="w-px h-3 bg-slate-300 ml-auto"></div>
                                            <div className="flex items-center gap-1.5 ml-auto">
                                                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                    {getCreditCost(cls.type)} {CREDIT_UNIT}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}

                            {/* Request Button */}
                            <div className="pt-2">
                                <Button
                                    onClick={() => setRequestOpen(true)}
                                    variant="ghost"
                                    className="w-full rounded-xl py-6 text-slate-500 border border-dashed border-slate-300 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-all font-medium"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    원하는 시간이 없나요? 수업 요청하기
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white border-2 border-dashed border-slate-100 rounded-3xl p-10 text-center flex flex-col items-center justify-center min-h-[300px] shadow-sm">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <CalendarIcon className="w-8 h-8 text-blue-400" />
                            </div>
                            <h4 className="text-xl font-bold text-slate-800 mb-2">예정된 수업이 없습니다</h4>
                            <p className="text-slate-500 mb-8 max-w-[200px] leading-relaxed">
                                선택하신 날짜에 개설된 수업이 없습니다. 새로운 수업을 요청해보세요!
                            </p>

                            <Button
                                size="lg"
                                className="rounded-full px-8 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
                                onClick={() => setRequestOpen(true)}
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                새 수업 요청하기
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Request Dialog */}
            <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>수업 개설 요청</DialogTitle>
                        <DialogDescription>
                            {date && format(date, 'yyyy년 M월 d일')} 수업 개설을 요청합니다.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="type">교육 종류</Label>
                            <Select value={reqType} onValueChange={setReqType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="종류 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pool">풀장 교육</SelectItem>
                                    <SelectItem value="theory">이론 교육</SelectItem>
                                    <SelectItem value="training">트레이닝</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {reqType === 'theory' ? (
                            <>
                                <div className="grid gap-2">
                                    <Label>방식</Label>
                                    <RadioGroup value={theoryType} onValueChange={(v: 'online' | 'offline') => setTheoryType(v)} className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="offline" id="req-offline" />
                                            <Label htmlFor="req-offline">오프라인</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="online" id="req-online" />
                                            <Label htmlFor="req-online">온라인</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                                
                                {theoryType === 'offline' && (
                                     <div className="grid gap-2">
                                        <Label htmlFor="location">희망 장소</Label>
                                        <Input
                                            id="location"
                                            placeholder="예: 강남구 테헤란로"
                                            value={reqLocation}
                                            onChange={(e) => setReqLocation(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="grid gap-2">
                                    <Label htmlFor="time">희망 시간</Label>
                                    <Input
                                        id="time"
                                        type="time"
                                        value={reqTime}
                                        onChange={(e) => setReqTime(e.target.value)}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="pool">희망 수영장/장소</Label>
                                    <Select value={reqPoolId} onValueChange={setReqPoolId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="수영장 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {pools.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="time">희망 시간</Label>
                                    {reqPoolId ? (
                                        isRequestHoliday ? (
                                             <div className="text-sm text-red-500">선택한 날짜는 해당 수영장 휴무일입니다.</div>
                                        ) : availableRequestTimeSlots.length > 0 ? (
                                            <Select value={reqTime} onValueChange={setReqTime}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="시간 선택" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableRequestTimeSlots.map(t => (
                                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="text-sm text-slate-500">가능한 시간대가 없습니다.</div>
                                        )
                                    ) : (
                                        <div className="text-sm text-slate-400">수영장을 먼저 선택해주세요.</div>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="grid gap-2">
                            <Label htmlFor="participants">신청 인원</Label>
                            <Select value={reqParticipants} onValueChange={setReqParticipants}>
                                <SelectTrigger>
                                    <SelectValue placeholder="인원 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4].map(num => (
                                        <SelectItem key={num} value={num.toString()}>{num}명</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[10px] text-slate-400">본인 포함 총 인원을 선택해주세요.</p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="instructions">상세 요청사항 (강사 전달)</Label>
                            <textarea
                                id="instructions"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="배우고 싶은 내용이나 현재 상태를 자유롭게 적어주세요. 동반 신청자가 있다면 이름을 적어주셔도 좋습니다."
                                value={reqInstructions}
                                onChange={(e) => setReqInstructions(e.target.value)}
                            />
                        </div>

                    </div>
                    <DialogFooter>
                        <Button
                            className="w-full"
                            onClick={handleRequest}
                            disabled={isRequesting || !reqTime || (reqType !== 'theory' && (!reqPoolId || isRequestHoliday))}
                        >
                            {isRequesting ? '요청 중...' : '요청 보내기'}
                            <Send className="w-4 h-4 ml-2" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="bg-blue-600 rounded-3xl p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-blue-200">
                <div className="text-center md:text-left">
                    <h3 className="text-2xl font-bold mb-1">나의 남은 크레딧</h3>
                    <p className="text-blue-100 opacity-80">크레딧을 사용하여 원하는 수업을 예약하세요.</p>
                </div>
                <div className="bg-white/20 backdrop-blur-md rounded-2xl px-8 py-4 text-center min-w-[160px]">
                    <span className="text-4xl font-black">{userCredits.toLocaleString()}</span>
                    <span className="text-xl ml-1 font-bold">{CREDIT_UNIT}</span>
                </div>
            </div>
        </div>
    )
}
