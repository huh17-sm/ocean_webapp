'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { updateClassRequest, updateClassRequestStatus } from '@/app/classes/actions'
import { Loader2, CheckCircle2, Save } from 'lucide-react'
import { CLASS_TYPES } from '@/lib/constants'
import { toast } from 'sonner'
import { Pool } from '@/types'
import { getPoolTimeSlots, isPoolHoliday } from '@/utils/pool-logic'
import { useMemo, useEffect } from 'react'

interface ClassRequest {
    id: string
    date: string
    type: string
    time_slot: string
    location: string
    participants?: number
    user_instructions?: string
    admin_comment?: string
    profiles: {
        name: string | null
        email: string | null
        phone_number: string | null
    }
}

interface ClassRequestEditDialogProps {
    request: ClassRequest
    trigger?: React.ReactNode
    onSuccess?: () => void
    pools: Pool[]
}

export function ClassRequestEditDialog({ request, trigger, onSuccess, pools }: ClassRequestEditDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form states
    const [date, setDate] = useState(request.date)
    const [time, setTime] = useState(request.time_slot)
    const [type, setType] = useState(request.type)
    const [location, setLocation] = useState(request.location)
    const [participants, setParticipants] = useState(request.participants?.toString() || '1')
    
    // Pool specific states
    const [selectedPoolId, setSelectedPoolId] = useState<string>('')
    const [submitType, setSubmitType] = useState<'save' | 'approve'>('save')

    // 초기 데이터 로드 시 수영장 매칭 시도
    useEffect(() => {
        if (open) {
            const matchedPool = pools.find(p => p.name === request.location)
            if (matchedPool) {
                setSelectedPoolId(matchedPool.id)
            }
        }
    }, [open, request.location, pools])

    // 수영장 선택 시 위치 문자열 업데이트
    useEffect(() => {
        if ((type === 'pool' || type === 'training') && selectedPoolId) {
            const pool = pools.find(p => p.id === selectedPoolId)
            if (pool) {
                setLocation(pool.name)
            }
        }
    }, [selectedPoolId, type, pools])

    // 선택된 수영장과 날짜에 따른 가능 시간 슬롯 계산
    const availableTimeSlots = useMemo(() => {
        if ((type === 'pool' || type === 'training') && selectedPoolId && date) {
            const pool = pools.find(p => p.id === selectedPoolId)
            if (!pool) return []
            
            const dateObj = new Date(date)
            if (isPoolHoliday(pool, dateObj)) return [] 
            
            return getPoolTimeSlots(pool, dateObj)
        }
        return []
    }, [selectedPoolId, date, type, pools])

    // 수영장 휴무일 여부
    const isHoliday = useMemo(() => {
        if ((type === 'pool' || type === 'training') && selectedPoolId && date) {
             const pool = pools.find(p => p.id === selectedPoolId)
             if (pool) return isPoolHoliday(pool, new Date(date))
        }
        return false
    }, [selectedPoolId, date, type, pools])


    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        
        const form = event.currentTarget
        const reason = (form.elements.namedItem('reason') as HTMLTextAreaElement).value

        const formData = new FormData()
        formData.append('date', date)
        formData.append('time', time)
        formData.append('type', type)
        formData.append('location', location)
        formData.append('admin_comment', reason)
        formData.append('participants', participants)

        try {
            // 1. 요청 정보 먼저 업데이트 (성공한 경우에만 다음 단계 진행)
            const updateResult = await updateClassRequest(request.id, formData)
            
            if (updateResult.error) {
                toast.error(updateResult.error)
                setLoading(false)
                return
            }

            // 2. '수정 및 승인' 버튼을 누른 경우 즉시 승인 처리 진행
            if (submitType === 'approve') {
                const approveResult = await updateClassRequestStatus(request.id, 'approved')
                if (approveResult?.error) {
                    toast.error(`수정은 완료되었으나 승인 중 오류가 발생했습니다: ${approveResult.error}`)
                } else {
                    toast.success('수정 및 승인이 완료되었습니다.')
                    setOpen(false)
                    if (onSuccess) onSuccess()
                }
            } else {
                // 단순 저장인 경우
                toast.success('수정사항이 저장되었습니다.')
                setOpen(false)
                if (onSuccess) onSuccess()
            }
        } catch (error) {
            console.error(error)
            toast.error('처리 중 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="flex-1 rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900">
                        수정
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>요청 내용 수정</DialogTitle>
                    <DialogDescription>
                        고객과 협의된 내용으로 요청 정보를 수정합니다.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="grid gap-4 py-4">
                    
                    {/* 날짜 선택 */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">날짜</Label>
                        <div className="col-span-3">
                            <Input
                                id="date"
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* 종류 선택 */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">종류</Label>
                        <div className="col-span-3">
                            <Select required value={type} onValueChange={(v) => {
                                setType(v)
                                if (v === 'theory') setSelectedPoolId('')
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="수업 종류 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="theory">{CLASS_TYPES.theory || '이론'}</SelectItem>
                                    <SelectItem value="pool">{CLASS_TYPES.pool || '풀장'}</SelectItem>
                                    <SelectItem value="training">{CLASS_TYPES.training || '트레이닝'}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 장소 선택 (풀장/트레이닝인 경우) */}
                    {(type === 'pool' || type === 'training') ? (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">장소</Label>
                            <div className="col-span-3">
                                <Select 
                                    required 
                                    value={selectedPoolId} 
                                    onValueChange={setSelectedPoolId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="수영장 선택" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pools.map(pool => (
                                            <SelectItem key={pool.id} value={pool.id}>
                                                {pool.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="location" className="text-right">장소</Label>
                            <div className="col-span-3">
                                <Input
                                    id="location"
                                    required
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="상세 주소를 입력하세요"
                                />
                            </div>
                        </div>
                    )}

                    {/* 시간 선택 */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="time" className="text-right">시간</Label>
                        <div className="col-span-3">
                            {(type === 'pool' || type === 'training') && selectedPoolId ? (
                                isHoliday ? (
                                    <div className="text-sm text-red-500 py-2">휴무일에는 시간을 선택할 수 없습니다.</div>
                                ) : availableTimeSlots.length > 0 ? (
                                    <Select required value={time.slice(0, 5)} onValueChange={setTime}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="시간 선택" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableTimeSlots.map(slot => (
                                                <SelectItem key={slot} value={slot.slice(0, 5)}>
                                                    {slot.slice(0, 5)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="text-sm text-slate-500 py-2">선택 가능한 시간이 없습니다.</div>
                                )
                            ) : (
                                <Input
                                    id="time"
                                    placeholder="예: 14:00"
                                    required
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                />
                            )}
                        </div>
                    </div>

                    {/* 인원수 수정 */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="participants" className="text-right">인원</Label>
                        <div className="col-span-3">
                            <Select value={participants} onValueChange={setParticipants}>
                                <SelectTrigger>
                                    <SelectValue placeholder="인원 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4].map(num => (
                                        <SelectItem key={num} value={num.toString()}>{num}명</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>



                    {/* 변경 사유 (알림 메시지) */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label htmlFor="reason" className="text-right mt-2">변경 사유</Label>
                        <div className="col-span-3">
                            <textarea
                                id="reason"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="사용자에게 전달될 변경 사유를 입력하세요."
                                required
                                defaultValue="고객 요청에 의한 일정 변경"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">* 이 내용은 사용자에게 알림으로 전달됩니다.</p>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2 sm:gap-0">
                        <Button 
                            type="submit" 
                            variant="outline" 
                            className="flex-1 rounded-xl border-slate-200"
                            disabled={loading}
                            onClick={() => setSubmitType('save')}
                        >
                            {loading && submitType === 'save' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Save className="w-4 h-4 mr-2" />
                            저장만 하기
                        </Button>
                        <Button 
                            type="submit" 
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200"
                            disabled={loading}
                            onClick={() => setSubmitType('approve')}
                        >
                            {loading && submitType === 'approve' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            수정 후 즉시 승인
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
