'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Plus, Minus, Trash2, Save, MapPin, Copy, MoreHorizontal, ChevronDown, ChevronUp } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from '@/lib/utils'
import { Pool, PoolSchedule, TimeRange, HolidayRule } from '@/types'
import { createPool, deletePool, updatePool, togglePoolActive as togglePoolActiveAction } from '@/app/admin/actions/pools'
import { toast } from 'sonner'
import { useConfirm } from '@/components/ui/confirm-dialog'
import { useRouter } from 'next/navigation'

// ... (other imports)

export default function PoolManagement({ initialPools }: { initialPools: Pool[] }) {
    const router = useRouter()
    const { confirm } = useConfirm()
    const [pools, setPools] = useState<Pool[]>(initialPools)
    const [newPoolName, setNewPoolName] = useState('')
    const [expandedPoolId, setExpandedPoolId] = useState<string | null>('1')
    
    // Holiday Rule State
    const [selectedWeek, setSelectedWeek] = useState<string>('2')
    const [selectedDay, setSelectedDay] = useState<string>('0') // 0 = Sunday

    // --- Actions ---

    const addPool = async () => {
        if (!newPoolName.trim()) return
        try {
            await createPool(newPoolName)
            setNewPoolName('')
            router.refresh()
            toast.success('수영장이 추가되었습니다.')
        } catch (error) {
            console.error(error)
            toast.error('수영장 추가 실패')
        }
    }

    const removePool = async (e: React.MouseEvent, poolId: string) => {
        e.stopPropagation()
        
        const confirmed = await confirm({
            title: '수영장 삭제',
            description: '정말 이 수영장 정보를 삭제하시겠습니까? 관련된 데이터가 모두 삭제될 수 있습니다.',
            confirmText: '삭제하기',
            variant: 'destructive',
        })

        if (!confirmed) return

        try {
            await deletePool(poolId)
            router.refresh()
            toast.success('수영장이 삭제되었습니다.')
        } catch (error) {
            console.error(error)
            toast.error('삭제 실패')
        }
    }

    const updatePoolName = (poolId: string, name: string) => {
        setPools(pools.map(p => p.id === poolId ? { ...p, name } : p))
    }

    const togglePoolActive = async (e: React.MouseEvent, poolId: string, currentStatus: boolean) => {
        e.stopPropagation()
        // Optimistic update
        setPools(pools.map(p => p.id === poolId ? { ...p, is_active: !p.is_active } : p))
        try {
            await togglePoolActiveAction(poolId, !currentStatus)
            router.refresh()
            toast.success(currentStatus ? '수영장이 비활성화되었습니다.' : '수영장이 활성화되었습니다.')
        } catch (error) {
            console.error(error)
            toast.error('상태 변경 실패')
            // Revert
            setPools(pools.map(p => p.id === poolId ? { ...p, is_active: currentStatus } : p))
        }
    }

    // ... (other functions)

    const toggleExpand = (poolId: string) => {
        setExpandedPoolId(expandedPoolId === poolId ? null : poolId)
    }

    const addTimeRange = (poolId: string, type: keyof PoolSchedule) => {
        setPools(pools.map(p => {
            if (p.id !== poolId) return p
            return {
                ...p,
                schedule: {
                    ...p.schedule,
                    [type]: [...p.schedule[type], { id: crypto.randomUUID(), start: '09:00', end: '12:00' }]
                }
            }
        }))
    }

    const removeTimeRange = (poolId: string, type: keyof PoolSchedule, rangeId: string) => {
        setPools(pools.map(p => {
            if (p.id !== poolId) return p
            return {
                ...p,
                schedule: {
                    ...p.schedule,
                    [type]: p.schedule[type].filter(r => r.id !== rangeId)
                }
            }
        }))
    }

    const updateTimeRange = (poolId: string, type: keyof PoolSchedule, rangeId: string, field: 'start' | 'end', value: string) => {
        setPools(pools.map(p => {
            if (p.id !== poolId) return p
            return {
                ...p,
                schedule: {
                    ...p.schedule,
                    [type]: p.schedule[type].map(r => r.id === rangeId ? { ...r, [field]: value } : r)
                }
            }
        }))
    }

    const copySchedule = (poolId: string, fromType: keyof PoolSchedule, toTypes: (keyof PoolSchedule)[]) => {
        setPools(pools.map(p => {
            if (p.id !== poolId) return p
            
            // Deep copy of the source schedule
            const sourceSchedule = p.schedule[fromType].map(item => ({ ...item, id: crypto.randomUUID() }))
            
            const newSchedule = { ...p.schedule }
            toTypes.forEach(targetType => {
                newSchedule[targetType] = sourceSchedule.map(item => ({ ...item, id: crypto.randomUUID() }))
            })

            return { ...p, schedule: newSchedule }
        }))
    }

    // Holiday Rule Functions
    const addHolidayRule = (poolId: string) => {
        const week = parseInt(selectedWeek)
        const day = parseInt(selectedDay)
        
        setPools(pools.map(p => {
            if (p.id !== poolId) return p
            // Check for duplicates
            if (p.holidayRules.some(r => r.week === week && r.day === day)) return p

            const newRule: HolidayRule = {
                id: crypto.randomUUID(),
                type: 'monthly',
                week,
                day
            }
            return { ...p, holidayRules: [...p.holidayRules, newRule] }
        }))
    }

    const removeHolidayRule = (poolId: string, ruleId: string) => {
        setPools(pools.map(p => {
            if (p.id !== poolId) return p
            return { ...p, holidayRules: p.holidayRules.filter(r => r.id !== ruleId) }
        }))
    }

    const getWeekLabel = (week: number) => {
        if (week === 1) return '첫째주'
        if (week === 2) return '둘째주'
        if (week === 3) return '셋째주'
        if (week === 4) return '넷째주'
        if (week === 5) return '마지막주'
        return `${week}째주`
    }

    const getDayLabel = (day: number) => {
        const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
        return days[day]
    }

    const handleSaveAll = async () => {
        try {
            await Promise.all(pools.map(p => updatePool(p)))
            toast.success('모든 변경사항이 저장되었습니다.')
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error('저장 중 오류가 발생했습니다.')
        }
    }

    const getLabel = (type: keyof PoolSchedule) => {
        switch (type) {
            case 'weekday': return '평일 (월~금)'
            case 'saturday': return '토요일'
            case 'sunday': return '일요일'
            case 'holiday': return '공휴일'
        }
    }

    // --- Sub-component for Schedule Column ---
    const ScheduleColumn = ({ pool, type, colorClass }: { pool: Pool, type: keyof PoolSchedule, colorClass: string }) => {
        const title = getLabel(type)
        const otherTypes = (Object.keys(pool.schedule) as (keyof PoolSchedule)[]).filter(t => t !== type)

        return (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-semibold flex items-center gap-2 ${colorClass}`}>
                        <div className={`w-2 h-2 rounded-full bg-current`} />
                        {title}
                    </h4>
                    <div className="flex gap-1">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-slate-200 text-slate-400">
                                    <MoreHorizontal className="w-3 h-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => copySchedule(pool.id, type, otherTypes)}>
                                    <Copy className="mr-2 h-3.5 w-3.5" />
                                    모든 요일에 복사
                                </DropdownMenuItem>
                                {otherTypes.map(ot => (
                                    <DropdownMenuItem key={ot} onClick={() => copySchedule(pool.id, type, [ot])}>
                                        <Copy className="mr-2 h-3.5 w-3.5" />
                                        {getLabel(ot)}로 복사
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 hover:bg-slate-200"
                            onClick={() => addTimeRange(pool.id, type)}
                        >
                            <Plus className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
                
                <div className="space-y-2">
                    {pool.schedule[type].map(range => (
                        <div key={range.id} className="flex items-center gap-1.5 bg-white p-2 rounded border shadow-sm text-sm">
                            <Input 
                                type="time" 
                                className="h-9 min-w-26 px-1 text-center text-sm" 
                                value={range.start}
                                onChange={(e) => updateTimeRange(pool.id, type, range.id, 'start', e.target.value)}
                            />
                            <span className="text-slate-400 shrink-0">~</span>
                            <Input 
                                type="time" 
                                className="h-9 min-w-26 px-1 text-center text-sm"
                                value={range.end}
                                onChange={(e) => updateTimeRange(pool.id, type, range.id, 'end', e.target.value)}
                            />
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 ml-auto shrink-0"
                                onClick={() => removeTimeRange(pool.id, type, range.id)}
                            >
                                <Minus className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                    {pool.schedule[type].length === 0 && (
                        <div className="text-xs text-slate-400 text-center py-2 italic cursor-pointer hover:text-slate-600" onClick={() => addTimeRange(pool.id, type)}>
                            + 시간 추가
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto p-4 md:p-0">
            {/* Header / Add Section */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                   <h2 className="text-2xl font-bold tracking-tight">수영장 관리</h2>
                   <p className="text-slate-500 text-sm mt-1">수업 장소로 사용할 수영장의 정보와 운영 시간을 관리합니다.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto h-10">
                    <Input 
                        placeholder="새 수영장 이름 (예: K-26)" 
                        value={newPoolName}
                        onChange={(e) => setNewPoolName(e.target.value)}
                        className="flex-1 md:w-64 h-full"
                    />
                    <Button onClick={addPool} disabled={!newPoolName.trim()} className="h-full">
                        <Plus className="mr-2 h-4 w-4" /> 추가
                    </Button>
                </div>
            </div>

            {/* Pools List */}
            <div className="space-y-4">
                {pools.map(pool => (
                    <Card key={pool.id} className={cn("overflow-hidden transition-all duration-200", !pool.is_active && "opacity-60 bg-slate-50")}>
                        <CardHeader 
                            className="bg-white border-b py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={() => toggleExpand(pool.id)}
                        >
                            <div className="flex items-center justify-between gap-3 min-h-12">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={cn("p-2 rounded-lg transition-colors shrink-0", pool.is_active ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-400")}>
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <Input 
                                            value={pool.name}
                                            onChange={(e) => updatePoolName(pool.id, e.target.value)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="font-bold text-lg py-1 px-1 border-transparent hover:border-slate-200 focus:border-slate-300 bg-transparent min-w-0 w-full truncate shadow-none h-auto p-0 focus:px-2 transition-all block"
                                        />
                                        <span className={cn("shrink-0 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap", 
                                            pool.is_active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"
                                        )}>
                                            {pool.is_active ? '사용가능' : '사용안함'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 md:gap-3 shrink-0">
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <span className="text-sm text-slate-500 hidden sm:inline">{pool.is_active ? 'ON' : 'OFF'}</span>
                                        <Switch 
                                            checked={pool.is_active}
                                            onCheckedChange={() => togglePoolActive({ stopPropagation: () => {} } as any, pool.id, pool.is_active)}
                                        />
                                    </div>
                                    
                                    <div className="h-4 w-px bg-slate-200 mx-1 hidden md:block" />
                                    
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="text-red-500 hover:bg-red-50 hover:text-red-600 px-2 h-8"
                                        onClick={(e) => removePool(e, pool.id)}
                                    >
                                        <Trash2 className="w-4 h-4 md:mr-2" /> 
                                        <span className="hidden md:inline">삭제</span>
                                    </Button>
                                    
                                    <div className="ml-0 text-slate-400">
                                        {expandedPoolId === pool.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        
                        {expandedPoolId === pool.id && (
                            <CardContent className="pt-6 bg-white animate-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <ScheduleColumn pool={pool} type="weekday" colorClass="text-slate-700" />
                                    <ScheduleColumn pool={pool} type="saturday" colorClass="text-blue-600" />
                                    <ScheduleColumn pool={pool} type="sunday" colorClass="text-red-500" />
                                    <ScheduleColumn pool={pool} type="holiday" colorClass="text-rose-600" />
                                </div>

                                {/* Regular Holidays Section */}
                                <div className="mt-8 pt-6 border-t border-slate-100">
                                    <h3 className="text-sm font-semibold mb-4 text-slate-800">정기 휴관일 설정</h3>
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                        <div className="flex flex-wrap items-center gap-2 mb-4">
                                            <span className="text-sm text-slate-600 mr-2">매월</span>
                                            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                                                <SelectTrigger className="w-[100px] h-9 bg-white">
                                                    <SelectValue placeholder="주 선택" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">첫째주</SelectItem>
                                                    <SelectItem value="2">둘째주</SelectItem>
                                                    <SelectItem value="3">셋째주</SelectItem>
                                                    <SelectItem value="4">넷째주</SelectItem>
                                                    <SelectItem value="5">마지막주</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Select value={selectedDay} onValueChange={setSelectedDay}>
                                                <SelectTrigger className="w-[100px] h-9 bg-white">
                                                    <SelectValue placeholder="요일 선택" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="1">월요일</SelectItem>
                                                    <SelectItem value="2">화요일</SelectItem>
                                                    <SelectItem value="3">수요일</SelectItem>
                                                    <SelectItem value="4">목요일</SelectItem>
                                                    <SelectItem value="5">금요일</SelectItem>
                                                    <SelectItem value="6">토요일</SelectItem>
                                                    <SelectItem value="0">일요일</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <Button size="sm" onClick={() => addHolidayRule(pool.id)} className="ml-auto md:ml-2">
                                                <Plus className="w-4 h-4 mr-1" /> 추가
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {pool.holidayRules.map(rule => (
                                                <div key={rule.id} className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200 shadow-sm text-sm">
                                                    <span className="text-slate-700">
                                                        매월 <span className="font-semibold text-rose-600">{getWeekLabel(rule.week)} {getDayLabel(rule.day)}</span> 휴관
                                                    </span>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => removeHolidayRule(pool.id, rule.id)}>
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {pool.holidayRules.length === 0 && (
                                                <div className="text-slate-400 italic text-sm p-2">등록된 정기 휴관일이 없습니다.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-end pt-4 border-t">
                <Button size="lg" className="bg-slate-900" onClick={handleSaveAll}>
                    <Save className="mr-2 h-4 w-4" /> 전체 변경사항 저장
                </Button>
            </div>
        </div>
    )
}
