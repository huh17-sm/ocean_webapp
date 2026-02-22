'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { TimePicker } from '@/components/ui/time-picker'
import { createClass, updateClass } from '@/app/admin/actions'
import { Loader2, Plus, Pencil, AlertTriangle } from 'lucide-react'
import { ClassData } from './availability-calendar' 
import { Pool } from '@/types'
import { getPoolTimeSlots, isPoolHoliday } from '@/utils/pool-logic'
import { format } from 'date-fns'
import { CLASS_TYPES } from '@/lib/constants'

interface ClassFormDialogProps {
    mode: 'create' | 'edit'
    initialData?: ClassData
    trigger?: React.ReactNode
    defaultDate?: string
    onSuccess?: () => void
    pools?: Pool[]
}

export function ClassFormDialog({ mode, initialData, trigger, defaultDate, onSuccess, pools = [] }: ClassFormDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Form states
    const [date, setDate] = useState(defaultDate || '')
    const [time, setTime] = useState('')
    const [title, setTitle] = useState('') // 수업 이름 상태 추가
    const [type, setType] = useState('pool') // pool, theory, training
    const [location, setLocation] = useState('') 
    const [maxCapacity, setMaxCapacity] = useState(4)
    
    // Theory specific states
    const [theoryType, setTheoryType] = useState<'online' | 'offline'>('offline')
    const [onlineUrl, setOnlineUrl] = useState('')

    // Pool specific states
    const [selectedPoolId, setSelectedPoolId] = useState<string>('')

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setDate(initialData.date)
            setTime(initialData.time.slice(0, 5)) // 초 단위 제거
            setTitle(initialData.title || '') // 수업 이름 설정
            setType(initialData.type)
            
            // Parse Location logic
            const loc = initialData.location || ''
            if (initialData.type === 'theory') {
                if (loc.startsWith('Online: ')) {
                    setTheoryType('online')
                    setOnlineUrl(loc.replace('Online: ', ''))
                    setLocation('')
                } else {
                    setTheoryType('offline')
                    setLocation(loc)
                }
            } else {
                // Try to find if location matches a pool name
                const matchedPool = pools.find(p => p.name === loc)
                if (matchedPool) {
                    setSelectedPoolId(matchedPool.id)
                    setLocation(loc)
                } else {
                    setLocation(loc) // Fallback or manual entry
                }
            }

            if (initialData.max_capacity) setMaxCapacity(initialData.max_capacity)
        } else if (mode === 'create' && defaultDate) {
            setDate(defaultDate)
        }
    }, [mode, initialData, defaultDate, open, pools])

    // Update location string when pool is selected
    useEffect(() => {
        if ((type === 'pool' || type === 'training') && selectedPoolId) {
            const pool = pools.find(p => p.id === selectedPoolId)
            if (pool) {
                setLocation(pool.name)
            }
        }
    }, [selectedPoolId, type, pools])

    // Get available time slots if pool is selected and date is set
    const availableTimeSlots = useMemo(() => {
        if ((type === 'pool' || type === 'training') && selectedPoolId && date) {
            const pool = pools.find(p => p.id === selectedPoolId)
            if (!pool) return []
            
            const dateObj = new Date(date)
            // Handle holiday check warning or disable?
            // For admin, maybe show warning but allow selection? Or strict? 
            // Strict is better to avoid mistakes.
            if (isPoolHoliday(pool, dateObj)) return [] 
            
            return getPoolTimeSlots(pool, dateObj)
        }
        return []
    }, [selectedPoolId, date, type, pools])

    // Warn if selected date is a holiday for the pool
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
        const formData = new FormData(event.currentTarget)
        formData.append('title', title) // 수업 이름 추가

        // Override location for specific logic
        let finalLocation = location
        if (type === 'theory') {
            if (theoryType === 'online') {
                finalLocation = `Online: ${onlineUrl}`
            }
        }
        formData.set('location', finalLocation)

        try {
            if (mode === 'create') {
                await createClass(formData)
                alert('수업이 등록되었습니다.')
            } else {
                if (!initialData?.id) throw new Error('Class ID missing')
                await updateClass(initialData.id, formData)
                alert('수업이 수정되었습니다.')
            }
            setOpen(false)
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error(error)
            alert(mode === 'create' ? '수업 생성 실패' : '수업 수정 실패')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" /> 수업 등록
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{mode === 'create' ? '새 수업 등록' : '수업 정보 수정'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'create' ? '새로운 다이빙 수업 일정을 추가합니다.' : '기존 수업 정보를 수정합니다.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="grid gap-4 py-4">
                    
                    {/* 0. Title Input */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">수업 이름</Label>
                        <Input
                            id="title"
                            placeholder="예: 레벨1 입문, 정기 트레이닝 등"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="col-span-3"
                        />
                    </div>

                    {/* 1. Type Selection */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">종류</Label>
                        <div className="col-span-3">
                            <Select name="type" required value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="수업 종류 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="theory">{CLASS_TYPES.theory}</SelectItem>
                                    <SelectItem value="pool">{CLASS_TYPES.pool}</SelectItem>
                                    <SelectItem value="training">{CLASS_TYPES.training}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* 2. Date Selection */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">날짜</Label>
                        <div className="col-span-3">
                            <Input
                                id="date"
                                name="date"
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                            {isHoliday && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> 선택한 날짜는 해당 수영장 휴무일입니다.</p>}
                        </div>
                    </div>

                    {/* 3. Location & Time Logic */}
                    {type === 'theory' ? (
                        <>
                             <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right mt-2">방식</Label>
                                <div className="col-span-3 space-y-3">
                                    <RadioGroup value={theoryType} onValueChange={(v: 'online' | 'offline') => setTheoryType(v)} className="flex gap-4">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="offline" id="offline" />
                                            <Label htmlFor="offline">오프라인</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="online" id="online" />
                                            <Label htmlFor="online">온라인 (Zoom 등)</Label>
                                        </div>
                                    </RadioGroup>
                                    
                                    {theoryType === 'online' ? (
                                        <Input 
                                            placeholder="접속 URL (예: Zoom 링크)" 
                                            value={onlineUrl}
                                            onChange={(e) => setOnlineUrl(e.target.value)}
                                            required
                                        />
                                    ) : (
                                        <Input 
                                            id="location"
                                            name="location" // Used if offline
                                            placeholder="상세 주소 (예: 강남구 테헤란로)" 
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            required
                                        />
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="time" className="text-right">시간</Label>
                                <TimePicker name="time" required value={time} onChange={setTime} className="col-span-3" />
                            </div>
                        </>
                    ) : (
                        <>
                             {/* Pool/Training: Pool Selection */}
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
                                            {/* Fallback for edited items that might not match? */}
                                        </SelectContent>
                                    </Select>
                                    {/* Hidden input for form submission if we want to rely on state or hidden field */}
                                    {/* We manually set formData 'location', so this isn't strictly needed if we intercept submit, but good for safety */}
                                </div>
                            </div>

                             {/* Time Selection based on Pool Schedule */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="time" className="text-right">시간</Label>
                                <div className="col-span-3">
                                    {selectedPoolId && date ? (
                                        isHoliday ? (
                                            <div className="text-sm text-red-500 py-2">휴무일에는 수업을 등록할 수 없습니다.</div>
                                        ) : availableTimeSlots.length > 0 ? (
                                            <Select name="time" required value={time} onValueChange={setTime}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="시간 선택" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableTimeSlots.map(slot => (
                                                        <SelectItem key={slot} value={slot}>
                                                            {slot.slice(0, 5)} 
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <div className="text-sm text-slate-500 py-2">등록된 일정이 없습니다.</div>
                                        )
                                    ) : (
                                        <div className="text-sm text-slate-400 py-2">수영장과 날짜를 먼저 선택해주세요.</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="max_capacity" className="text-right">정원</Label>
                        <Input
                            id="max_capacity"
                            name="max_capacity"
                            type="number"
                            required
                            value={maxCapacity}
                            onChange={(e) => setMaxCapacity(parseInt(e.target.value))}
                            className="col-span-3"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading || (type !== 'theory' && isHoliday)}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === 'create' ? '등록하기' : '수정 저장'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
