'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

import { ChevronLeft, ChevronRight, Ban, CheckCircle, Calendar as CalendarIcon, UserPlus, FileText, Plus, Pencil, Link as LinkIcon } from "lucide-react"
import { format, addMonths, subMonths, startOfToday, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Badge } from "@/components/ui/badge" // Add Badge import
import { addAvailabilityBlock, removeAvailabilityBlock, getClassRequests, updateAvailabilityBlock, getPendingRequestDates, updateClassRequestStatus, getAllClassRequests } from '@/app/classes/actions'
import { deleteClass } from '@/app/admin/actions'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from "@/lib/utils"
import { isRedDay } from "@/lib/holidays"
import { ClassFormDialog } from './class-form-dialog'
import { ClassRequestEditDialog } from './class-request-edit-dialog'
import { ClassDetailModal } from './class-detail-modal'
import { Pool } from '@/types'
import { CLASS_TYPES, CLASS_COLORS, DEFAULT_CREDIT_COSTS, ClassTypeSetting, CREDIT_UNIT } from '@/lib/constants'

export interface ClassData {
    id: string
    date: string
    time: string
    type: string
    location?: string
    location_id?: string
    max_capacity?: number
    current_enrollment?: number
    title?: string
    media_link?: string | null
    created_at?: string
    is_completed?: boolean
}

interface AvailabilityBlock {
    id: string
    start_date: string
    end_date: string
    reason?: string
}

interface ClassRequest {
    id: string
    date: string
    type: string
    time_slot: string
    location: string
    status: string
    participants?: number
    user_instructions?: string
    profiles: {
        name: string | null
        email: string | null
        phone_number: string | null
    }
}

import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"

export default function AdminAvailabilityCalendar({
    existingClasses,
    existingBlocks,
    pools = [],
    classTypeSettings = []
}: {
    existingClasses: ClassData[],
    existingBlocks: AvailabilityBlock[],
    pools?: Pool[],
    classTypeSettings?: ClassTypeSetting[]
}) {
    const { confirm } = useConfirm() // useConfirm 훅 사용
    const [date, setDate] = useState<Date | undefined>(new Date())
    const [viewMonth, setViewMonth] = useState<Date>(new Date())
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const searchParams = useSearchParams()
    
    // Initialize activeTab from URL or default to 'schedule'
    const [activeTab, setActiveTab] = useState<'schedule' | 'requests' | 'block'>('schedule')

    useEffect(() => {
        const tabParam = searchParams.get('tab')
        if (tabParam === 'requests' || tabParam === 'schedule' || tabParam === 'block') {
            setActiveTab(tabParam)
        }
    }, [searchParams])

    const [allPendingRequests, setAllPendingRequests] = useState<ClassRequest[]>([])
    const [isLoadingRequests, setIsLoadingRequests] = useState(false)
    const [pendingRequestDates, setPendingRequestDates] = useState<string[]>([])

    // Class Detail Modal
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [selectedClassForDetail, setSelectedClassForDetail] = useState<ClassData | null>(null)

    const fetchAllRequests = async () => {
        setIsLoadingRequests(true)
        try {
            const reqs = await getAllClassRequests()
            setAllPendingRequests(reqs as any)
            
            // 캘린더 표시용 날짜 추출
            const dates = Array.from(new Set(reqs.map((r: any) => r.date))) as string[]
            setPendingRequestDates(dates)
        } catch (e) {
            console.error(e)
            toast.error('요청 목록을 불러오지 못했습니다.')
        } finally {
            setIsLoadingRequests(false)
        }
    }

    // 마운트 시 모든 대기 요청 가져오기
    useEffect(() => {
        fetchAllRequests()
    }, [])

    
    // Block State
    const [blockReason, setBlockReason] = useState('')
    const [blockStartDate, setBlockStartDate] = useState<string>('')
    const [blockEndDate, setBlockEndDate] = useState<string>('')
    const [isBlocking, setIsBlocking] = useState(false)

    const router = useRouter()

    const isDateBlocked = (d: Date) => {
        const dStr = format(d, 'yyyy-MM-dd')
        return existingBlocks.find(block => 
            dStr >= block.start_date && dStr <= block.end_date
        )
    }

    const hasClasses = (d: Date) => {
        const dStr = format(d, 'yyyy-MM-dd')
        return existingClasses.some(cls => cls.date === dStr)
    }

    const getDayStyle = (d: Date) => {
        const dStr = format(d, 'yyyy-MM-dd')
        const blocked = isDateBlocked(d)
        const hasClass = hasClasses(d)
        const isRed = isRedDay(d)

        if (blocked) return "text-slate-300 font-medium"
        // If has class, keep bold but apply red if it's red day? Maybe just keep red.
        if (isRed) return "text-red-500 font-bold"
        if (hasClass) return "font-bold text-slate-900" 
        return "text-slate-900"
    }

    const handleDateSelect = async (selectedDate: Date | undefined) => {
        setDate(selectedDate)
        if (!selectedDate) return
        
        if (selectedDate) {
            const blocked = isDateBlocked(selectedDate)
            if (blocked) {
                setBlockStartDate(blocked.start_date)
                setBlockEndDate(blocked.end_date)
                setBlockReason(blocked.reason || '')
                setActiveTab('block')
            } else {
                const dateStr = format(selectedDate, 'yyyy-MM-dd')
                setBlockStartDate(dateStr)
                setBlockEndDate(dateStr)
                setBlockReason('')
                // '요청 목록' 탭이 아닐 때는 '수업 등록' 탭으로 자동 전환
                if (activeTab !== 'requests') {
                    setActiveTab('schedule') 
                }
            }
        } else {
            setBlockReason('')
        }
    }

    const handleRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
        const confirmed = await confirm({
            title: status === 'approved' ? '요청 승인' : '요청 거절',
            description: `${status === 'approved' ? '이 요청을 승인하시겠습니까?' : '이 요청을 거절하시겠습니까? 거절 시 사유를 입력할 수 없습니다.'}`,
            confirmText: status === 'approved' ? '승인하기' : '거절하기',
            variant: status === 'approved' ? 'default' : 'destructive',
        })
        
        if (!confirmed) return
        
        try {
            const result = await updateClassRequestStatus(requestId, status)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('처리되었습니다.')
                // 1. 상태 낙관적 업데이트 (UI 즉시 반영)
                setAllPendingRequests(prev => prev.filter(r => r.id !== requestId))
                
                // 2. 남은 요청을 기반으로 캘린더의 노란 점(날짜) 갱신
                const remainingReqs = allPendingRequests.filter(r => r.id !== requestId)
                const dates = Array.from(new Set(remainingReqs.map(r => r.date)))
                setPendingRequestDates(dates)
                
                router.refresh()
            }
        } catch (e) {
            console.error(e)
            toast.error('오류가 발생했습니다.')
        }
    }

    const handleBlock = async () => {
        if (!blockStartDate || !blockEndDate) {
            toast.error('시작일과 종료일을 모두 선택해주세요.')
            return
        }
        
        try {
            setIsBlocking(true)
            const startDate = parseISO(blockStartDate)
            const endDate = parseISO(blockEndDate)

            if (startDate > endDate) {
                toast.error('종료일은 시작일보다 빠를 수 없습니다.')
                return
            }

            // Check for overlap
            const isOverlap = existingBlocks.some(block => {
                return blockStartDate <= block.end_date && blockEndDate >= block.start_date
            })

            if (isOverlap) {
                toast.error('이미 차단된 기간과 겹칩니다.')
                return
            }

            // Pass strings directly
            const result = await addAvailabilityBlock(blockStartDate, blockEndDate, blockReason)
            
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('설정되었습니다.')
                router.refresh()
            }
        } catch (e) {
            console.error(e)
            toast.error('오류가 발생했습니다.')
        } finally {
            setIsBlocking(false)
        }
    }

    const handleUnblock = async (blockId: string) => {
        const result = await removeAvailabilityBlock(blockId)
        if (result.error) toast.error(result.error)
        else {
            toast.success('해제되었습니다.')
            router.refresh()
        }
    }

    const handleUpdate = async (blockId: string) => {
        if (!blockStartDate || !blockEndDate) return
        
        try {
            setIsBlocking(true)
            const startDate = parseISO(blockStartDate)
            const endDate = parseISO(blockEndDate)

            if (startDate > endDate) {
                toast.error('종료일은 시작일보다 빠를 수 없습니다.')
                return
            }

            // Check for overlap (exclude current block)
            const isOverlap = existingBlocks.some(block => {
                if (block.id === blockId) return false
                return blockStartDate <= block.end_date && blockEndDate >= block.start_date
            })

            if (isOverlap) {
                toast.error('다른 차단된 기간과 겹칩니다.')
                return
            }

            // Pass strings directly
            const result = await updateAvailabilityBlock(blockId, blockStartDate, blockEndDate, blockReason)
            
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success('수정되었습니다.')
                router.refresh()
            }
        } catch (e) {
            console.error(e)
            toast.error('오류가 발생했습니다.')
        } finally {
            setIsBlocking(false)
        }
    }

    const currentBlock = date ? isDateBlocked(date) : null

    return (
        <div className="max-w-6xl mx-auto p-0 space-y-8 animate-in fade-in duration-700">
            <div className="grid md:grid-cols-[1.5fr,1fr] gap-8">
                {/* Left: Calendar */}
                <Card className="border-none shadow-xl shadow-blue-100/50 rounded-3xl overflow-hidden bg-white/80 backdrop-blur-xl h-fit">
                     <CardHeader className="px-8 pt-8 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-2xl font-black bg-linear-to-br from-blue-700 to-cyan-500 bg-clip-text text-transparent">
                                캘린더 관리
                            </CardTitle>
                        
                             <div className="flex items-center gap-1">
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={() => setViewMonth(prev => subMonths(prev, 1))}
                                    className="h-8 w-8 rounded-full border-slate-200 hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition-all"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <div className="text-lg font-bold w-32 text-center text-slate-800 tracking-tight">
                                    {format(viewMonth, 'yyyy. MM', { locale: ko })}
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={() => setViewMonth(prev => addMonths(prev, 1))}
                                    className="h-8 w-8 rounded-full border-slate-200 hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition-all"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateSelect}
                            month={viewMonth}
                            onMonthChange={setViewMonth}
                            locale={ko}
                            className="w-full max-w-full"
                            classNames={{
                                caption: 'hidden',
                                nav: 'hidden'
                            }}
                            components={{
                                DayButton: (props: any) => {
                                    const { day } = props
                                    const d = day.date
                                    const dStr = format(d, 'yyyy-MM-dd')
                                    const dayClasses = existingClasses.filter(c => c.date === dStr)
                                    const style = getDayStyle(d) // Fallback
                                    const isSelected = props.modifiers.selected

                                    // Block Logic
                                    const blocked = existingBlocks.find(b => dStr >= b.start_date && dStr <= b.end_date)
                                    
                                    let blockStyle = ""
                                    let blockContent = null
                                    
                                    if (blocked) {
                                        const isStart = dStr === blocked.start_date
                                        const isEnd = dStr === blocked.end_date
                                        
                                        // Base block style
                                        blockStyle = "text-slate-300 w-full h-full aspect-square disabled:opacity-100" // No background

                                        // Center Text Calculation
                                        const start = parseISO(blocked.start_date)
                                        const end = parseISO(blocked.end_date)
                                        const diffTime = Math.abs(end.getTime() - start.getTime());
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                                        // Find middle day index
                                        const midIndex = Math.floor(diffDays / 2)
                                        const middleDateStr = format(new Date(start.getTime() + midIndex * (1000 * 60 * 60 * 24)), 'yyyy-MM-dd')

                                        if (dStr === middleDateStr) {
                                            blockContent = (
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-[200px] flex justify-center pointer-events-none">
                                                    <span className="text-[10px] font-bold text-slate-500 bg-white/90 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap overflow-hidden border border-slate-200/50">
                                                        {blocked.reason}
                                                    </span>
                                                </div>
                                            )
                                        }
                                    }

                                    return (
                                        <CalendarDayButton 
                                            {...props} 
                                            className={cn(
                                                props.className, 
                                                blocked ? blockStyle : style, 
                                                !blocked && "hover:bg-blue-50/80 transition-all duration-300 rounded-xl aspect-square"
                                            )}
                                        >
                                            <div className="relative flex flex-col items-center justify-start h-full w-full pt-1.5 gap-1">
                                                <span className={cn(
                                                    "text-sm font-medium leading-none w-7 h-7 flex items-center justify-center rounded-full transition-all z-10",
                                                    isSelected ? "bg-white/20" : "",
                                                    blocked ? "text-slate-400 opacity-50" : ""
                                                )}>{d.getDate()}</span>

                                                {/* Reason Text Middle */}
                                                {blocked && blockContent}

                                                {!blocked && dayClasses.length > 0 && (
                                                    <div className="flex gap-0.5 justify-center flex-wrap max-w-[90%] content-start min-h-[6px]">
                                                        {dayClasses.slice(0, 4).map((cls: any, i: number) => (
                                                            <div
                                                                key={cls.id + i}
                                                                className={cn(
                                                                    "w-1.5 h-1.5 rounded-full ring-[1px] ring-white transition-transform hover:scale-125",
                                                                    CLASS_COLORS[cls.type as keyof typeof CLASS_COLORS] || CLASS_COLORS.default,
                                                                    isSelected ? "ring-blue-400" : ""
                                                                )}
                                                            />
                                                        ))}
                                                        {dayClasses.length > 4 && <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ring-[1px] ring-white" />}
                                                    </div>
                                                )}
                                                
                                                {!blocked && dayClasses.length === 0 && pendingRequestDates.includes(format(d, 'yyyy-MM-dd')) && (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ring-[1px] ring-white" />
                                                )}
                                                {/* Also show if there are classes AND pending requests */}
                                                {!blocked && dayClasses.length > 0 && pendingRequestDates.includes(format(d, 'yyyy-MM-dd')) && (
                                                     <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-500 animate-pulse ring-1 ring-white translate-x-[2px] -translate-y-[2px]" />
                                                )}
                                            </div>
                                        </CalendarDayButton>
                                    )
                                }
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
                
                {/* Right: Action Panel */}
                <div className="h-full">
                     <Card className="h-full border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white/90 backdrop-blur-xl ring-1 ring-slate-100">
                        <CardHeader className="px-6 py-6 border-b border-slate-100 bg-slate-50/50">
                            {activeTab === 'requests' ? (
                                <>
                                    <CardTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                        <div className="relative">
                                            <FileText className="w-5 h-5 text-amber-500" />
                                            {allPendingRequests.length > 0 && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                                        </div>
                                        수업 요청 관리
                                    </CardTitle>
                                    <CardDescription className="text-slate-500 font-medium">
                                        전체 대기 중인 요청 {allPendingRequests.length}건
                                    </CardDescription>
                                </>
                            ) : (
                                <>
                                    <CardTitle className="text-xl font-bold text-slate-800">{date ? format(date, 'yyyy년 M월 d일') : '날짜 선택'}</CardTitle>
                                    <CardDescription className="text-slate-500 font-medium">
                                        {date ? (
                                            <span className="flex items-center gap-1.5 text-blue-600">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                작업을 선택하세요
                                            </span>
                                        ) : '캘린더에서 날짜를 선택해주세요'}
                                    </CardDescription>
                                </>
                            )}
                        </CardHeader>
                        <CardContent className="p-0 flex flex-col h-[calc(100%-88px)]">
                            {/* 항상 탭 메뉴 표시 */}
                            <div className="flex flex-col h-full">
                                {/* 탭 헤더 */}
                                <div className="flex border-b border-slate-100">
                                    <button 
                                        onClick={() => setActiveTab('schedule')}
                                        className={cn("flex-1 py-4 text-sm font-bold border-b-2 transition-all", activeTab === 'schedule' ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50")}
                                    >
                                        수업 등록
                                    </button>
                                    <button 
                                        onClick={() => setActiveTab('requests')}
                                        className={cn("flex-1 py-4 text-sm font-bold border-b-2 transition-all relative", activeTab === 'requests' ? "border-amber-500 text-amber-600 bg-amber-50/50" : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50")}
                                    >
                                        요청 목록
                                        {allPendingRequests.length > 0 && <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>}
                                    </button>
                                        <button 
                                        onClick={() => setActiveTab('block')}
                                        className={cn("flex-1 py-4 text-sm font-bold border-b-2 transition-all", activeTab === 'block' ? "border-red-500 text-red-500 bg-red-50/50" : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50")}
                                    >
                                        예약 차단
                                    </button>
                                </div>

                                {/* Tab Content */}
                                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                                    {activeTab === 'schedule' && (
                                        date ? (
                                        <div className="space-y-6">
                                            <div className="space-y-3">
                                                <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                                    등록된 수업
                                                </h4>
                                                {existingClasses.filter(c => c.date === format(date, 'yyyy-MM-dd')).length > 0 ? (
                                                    <ul className="space-y-3">
                                                        {existingClasses.filter(c => c.date === format(date, 'yyyy-MM-dd')).map(c => (
                                                            <li
                                                                key={c.id}
                                                                className="group p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col gap-3 ring-1 ring-slate-100/50 cursor-pointer"
                                                                onClick={() => {
                                                                    setSelectedClassForDetail(c)
                                                                    setDetailModalOpen(true)
                                                                }}
                                                            >
                                                                <div className="flex justify-between items-center">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className={cn(
                                                                            "w-3 h-3 rounded-full shadow-sm ring-2 ring-white",
                                                                            CLASS_COLORS[c.type as keyof typeof CLASS_COLORS] || CLASS_COLORS.default
                                                                        )} />
                                                                        <div className="flex flex-col gap-0.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-bold text-slate-800">{c.time.slice(0, 5)}</span>
                                                                                {c.title && <span className="font-bold text-slate-700 text-sm">{c.title}</span>}
                                                                            </div>
                                                                            <span className="text-xs font-medium text-slate-500 flex items-center gap-1 flex-wrap">
                                                                                {CLASS_TYPES[c.type as keyof typeof CLASS_TYPES] || c.type}
                                                                                {c.location && (
                                                                                    <>
                                                                                        <span>·</span>
                                                                                        {(() => {
                                                                                            const urlMatch = c.location.match(/(https?:\/\/[^\s]+)/);
                                                                                            const locationUrl = urlMatch ? urlMatch[0] : null;
                                                                                            
                                                                                            if (locationUrl) {
                                                                                                return (
                                                                                                    <a 
                                                                                                        href={locationUrl}
                                                                                                        target="_blank"
                                                                                                        rel="noopener noreferrer"
                                                                                                        className="flex items-center gap-1 hover:text-blue-600 hover:underline transition-colors"
                                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                                    >
                                                                                                        <LinkIcon className="w-3 h-3" />
                                                                                                        {c.location}
                                                                                                    </a>
                                                                                                );
                                                                                            }
                                                                                            return c.location;
                                                                                        })()}
                                                                                    </>
                                                                                )}
                                                                                <span className="ml-2 font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">
                                                                                    {classTypeSettings?.find(s => s.type === c.type)?.credit_cost ?? DEFAULT_CREDIT_COSTS[c.type as keyof typeof DEFAULT_CREDIT_COSTS] ?? 1} {CREDIT_UNIT}
                                                                                </span>
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                                                        <ClassFormDialog
                                                                            mode="edit"
                                                                            initialData={c}
                                                                            pools={pools}
                                                                            trigger={
                                                                                <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] rounded-lg border-slate-200 hover:bg-slate-50 hover:text-slate-900">
                                                                                    수정
                                                                                </Button>
                                                                            }
                                                                        />
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                                            onClick={async () => {
                                                                                const confirmed = await confirm({
                                                                                    title: '수업 삭제',
                                                                                    description: '정말 이 수업을 삭제하시겠습니까? 관련된 예약 정보도 함께 삭제될 수 있습니다.',
                                                                                    confirmText: '삭제하기',
                                                                                    variant: 'destructive',
                                                                                })

                                                                                if (confirmed) {
                                                                                    try {
                                                                                        await deleteClass(c.id)
                                                                                        toast.success('삭제되었습니다.')
                                                                                        router.refresh()
                                                                                    } catch (e) {
                                                                                        console.error(e)
                                                                                        toast.error('삭제 중 오류가 발생했습니다.')
                                                                                    }
                                                                                }
                                                                            }}
                                                                        >
                                                                            <Ban className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                        <p className="text-sm font-medium text-slate-400">등록된 수업이 없습니다.</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-5 bg-linear-to-br from-slate-50 to-white rounded-2xl border border-slate-200/60 shadow-inner">
                                                <h4 className="font-bold text-sm text-slate-800 mb-1">새 수업 등록</h4>
                                                <p className="text-xs text-slate-500 mb-4">선택한 날짜에 새로운 정규 수업을 개설합니다.</p>
                                                <ClassFormDialog 
                                                    mode="create" 
                                                    defaultDate={format(date, 'yyyy-MM-dd')}
                                                    pools={pools}
                                                    trigger={
                                                        <Button className="w-full bg-slate-900 border border-transparent text-white hover:bg-slate-800 shadow-lg shadow-slate-200/50 rounded-xl h-11 font-bold">
                                                            <Plus className="w-4 h-4 mr-2" /> 수업 등록하기
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                        </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 space-y-4">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                                    <CalendarIcon className="w-8 h-8 opacity-20" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-medium text-slate-500">날짜가 선택되지 않았습니다</p>
                                                </div>
                                            </div>
                                        )
                                    )}

                                    {activeTab === 'requests' && (
                                        <div className="space-y-4">
                                            {isLoadingRequests ? (
                                                 <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div></div>
                                            ) : allPendingRequests.length > 0 ? (
                                                <div className="space-y-3">
                                                    {allPendingRequests.map(req => (
                                                        <div key={req.id} className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm space-y-3 hover:shadow-md transition-shadow">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                         <Badge variant="outline" className="text-xs font-normal text-slate-500 border-slate-200">
                                                                             {format(new Date(req.date), 'M.d (eee)', { locale: ko })}
                                                                         </Badge>
                                                                         <div className="flex flex-col">
                                                                             <span className="font-bold text-slate-800 text-sm">
                                                                                 {req.profiles?.name || '[이름 미등록]'}
                                                                             </span>
                                                                             <div className="flex items-center gap-1">
                                                                                 <span className="text-[10px] text-slate-400">{req.profiles?.email}</span>
                                                                                 <button 
                                                                                     onClick={() => {
                                                                                         if (req.profiles?.email) {
                                                                                             navigator.clipboard.writeText(req.profiles.email)
                                                                                             toast.success('이메일이 복사되었습니다.')
                                                                                         }
                                                                                     }}
                                                                                     className="text-[10px] text-blue-500 hover:underline"
                                                                                 >
                                                                                     복사
                                                                                 </button>
                                                                             </div>
                                                                         </div>
                                                                     </div>
                                                                 </div>
                                                                 <div className="flex flex-col items-end gap-1">
                                                                     <span className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-bold uppercase tracking-wide">대기중</span>
                                                                     <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{req.participants || 1}명 신청</span>
                                                                 </div>
                                                             </div>
                                                             <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                                                                 <div className="flex justify-between"><span className="text-slate-400 text-xs">희망 시간</span> <span className="font-medium">{req.time_slot}</span></div>
                                                                 <div className="flex justify-between"><span className="text-slate-400 text-xs">종류</span> <span className="font-medium">{CLASS_TYPES[req.type as keyof typeof CLASS_TYPES] || req.type}</span></div>
                                                                 <div className="flex justify-between overflow-hidden">
                                                                     <span className="text-slate-400 text-xs shrink-0 mr-2">장소</span>
                                                                     <span className="font-medium text-right truncate">
                                                                         {(() => {
                                                                            const urlMatch = req.location.match(/(https?:\/\/[^\s]+)/);
                                                                            const locationUrl = urlMatch ? urlMatch[0] : null;
                                                                            
                                                                            if (locationUrl) {
                                                                                return (
                                                                                    <a 
                                                                                        href={locationUrl}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="flex items-center gap-1 justify-end hover:text-blue-600 hover:underline transition-colors"
                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                    >
                                                                                        <LinkIcon className="w-3 h-3 shrink-0" />
                                                                                        <span className="truncate">{req.location}</span>
                                                                                    </a>
                                                                                );
                                                                            }
                                                                            return req.location;
                                                                         })()}
                                                                     </span>
                                                                 </div>
                                                                 
                                                                 {req.user_instructions && (
                                                                     <div className="mt-2 pt-2 border-t border-slate-200">
                                                                         <p className="text-[11px] text-slate-400 mb-1">고객 요청사항:</p>
                                                                         <p className="text-xs text-slate-700 leading-relaxed italic">"{req.user_instructions}"</p>
                                                                     </div>
                                                                 )}
                                                             </div>
                                                            <div className="flex gap-2 pt-1">

                                                                <Button 
                                                                    size="sm" 
                                                                    className="flex-1 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900" 
                                                                    variant="outline"
                                                                    onClick={() => handleRequestStatus(req.id, 'rejected')}
                                                                >
                                                                    거절
                                                                </Button>

                                                                <ClassRequestEditDialog 
                                                                    request={req}
                                                                    onSuccess={fetchAllRequests}
                                                                    pools={pools}
                                                                />
                                                                <Button 
                                                                    size="sm" 
                                                                    className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
                                                                    onClick={() => handleRequestStatus(req.id, 'approved')}
                                                                >
                                                                    승인
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 flex flex-col items-center justify-center text-slate-400">
                                                    <FileText className="w-10 h-10 mb-3 opacity-20" />
                                                    <p className="text-sm">대기 중인 요청이 없습니다.</p>
                                                    <p className="text-xs text-slate-400 mt-1">모든 요청이 처리되었습니다.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === 'block' && (
                                        date ? (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">시작일</Label>
                                                    <Input 
                                                        type="date" 
                                                        value={blockStartDate}
                                                        onChange={(e) => setBlockStartDate(e.target.value)}
                                                        className="rounded-xl border-slate-200 focus:ring-red-200 focus:border-red-400"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">종료일</Label>
                                                    <Input 
                                                        type="date" 
                                                        value={blockEndDate}
                                                        min={blockStartDate}
                                                        onChange={(e) => setBlockEndDate(e.target.value)}
                                                        className="rounded-xl border-slate-200 focus:ring-red-200 focus:border-red-400"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">사유 (선택)</Label>
                                                <Input 
                                                    placeholder="예: 강사 일정, 공휴일 등" 
                                                    value={blockReason}
                                                    onChange={(e) => setBlockReason(e.target.value)}
                                                    className="rounded-xl border-slate-200 focus:ring-red-200 focus:border-red-400"
                                                />
                                            </div>
                                            
                                            <div className="pt-4 border-t border-slate-100">
                                                {currentBlock ? (
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            className="flex-1 bg-slate-900 hover:bg-slate-800 rounded-xl" 
                                                            onClick={() => handleUpdate(currentBlock.id)}
                                                            disabled={isBlocking}
                                                        >
                                                            {isBlocking ? '저장 중...' : '수정 사항 저장'}
                                                        </Button>
                                                        <Button 
                                                            variant="destructive" 
                                                            className="rounded-xl"
                                                            onClick={() => handleUnblock(currentBlock.id)}
                                                            disabled={isBlocking}
                                                        >
                                                            차단 해제
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        className="w-full bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg shadow-red-200 h-11 font-bold" 
                                                        onClick={handleBlock}
                                                        disabled={isBlocking}
                                                    >
                                                        {isBlocking ? '처리 중...' : '선택 기간 예약 차단하기'}
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            <div className="bg-red-50/50 p-4 rounded-xl text-xs text-red-600/80 leading-relaxed">
                                                <p className="font-bold mb-1">ⓘ 주의사항</p>
                                                차단된 기간에는 회원이 새로운 예약을 할 수 없습니다. 기존 예약은 유지됩니다.
                                            </div>
                                        </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 space-y-4">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                                                    <Ban className="w-8 h-8 opacity-20" />
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-medium text-slate-500">날짜가 선택되지 않았습니다</p>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </CardContent>
                     </Card>
                </div>
            </div>

            {/* Class Detail Modal */}
            {selectedClassForDetail && (
                <ClassDetailModal
                    classData={selectedClassForDetail}
                    open={detailModalOpen}
                    onOpenChange={setDetailModalOpen}
                    onRefresh={() => router.refresh()}
                    classTypeSettings={classTypeSettings}
                />
            )}
        </div>
    )
}
