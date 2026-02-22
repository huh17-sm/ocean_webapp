'use client'

import { useState, useEffect, useTransition } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Link as LinkIcon,
    UserPlus,
    UserMinus,
    MessageSquare,
    Save,
    Loader2,
    Search,
    X,
    Check,
    CheckCircle,
} from 'lucide-react'
import {
    getClassStudents,
    updateClassMediaLink,
    updateClassCompletion,
    addStudentToClass,
    removeStudentFromClass,
    searchUsers,
    completeReservation,
    cancelReservationCompletion,
} from '@/app/admin/actions'
import { CLASS_TYPES, DEFAULT_CREDIT_COSTS, CREDIT_UNIT } from '@/lib/constants'
import { toast } from 'sonner'
import { useConfirm } from '@/components/ui/confirm-dialog'
import Link from 'next/link'
import type { ClassData } from './availability-calendar'

interface Student {
    id: string
    user_id: string
    status: string
    credit_cost: number
    credit_refunded: boolean
    debriefing: string | null
    debriefing_at: string | null
    profiles: { name: string | null; email: string | null } | null
}

interface SearchResult {
    id: string
    name: string | null
    email: string
    general_credits: number
}

interface ClassDetailModalProps {
    classData: ClassData
    open: boolean
    onOpenChange: (open: boolean) => void
    onRefresh?: () => void
    classTypeSettings?: { type: string; credit_cost: number }[]
}

export function ClassDetailModal({
    classData,
    open,
    onOpenChange,
    onRefresh,
    classTypeSettings = [],
}: ClassDetailModalProps) {
    const { confirm } = useConfirm()
    const [isPending, startTransition] = useTransition()

    // Media link
    const [mediaLink, setMediaLink] = useState(classData.media_link || '')
    const [mediaLinkSaved, setMediaLinkSaved] = useState(false)

    // Students
    const [students, setStudents] = useState<Student[]>([])
    const [loadingStudents, setLoadingStudents] = useState(false)

    // Class Completion
    const [isCompleted, setIsCompleted] = useState(classData.is_completed || false)

    // Add student
    const [showAddStudent, setShowAddStudent] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null)
    const [creditCostInput, setCreditCostInput] = useState('')

    // Reset state when dialog opens/classData changes
    useEffect(() => {
        if (open) {
            setMediaLink(classData.media_link || '')
            setMediaLinkSaved(false)
            setIsCompleted(classData.is_completed || false)
            setShowAddStudent(false)
            setSearchQuery('')
            setSearchResults([])
            setSelectedUser(null)
            fetchStudents()

            // Set default credit cost from settings
            const setting = classTypeSettings.find(s => s.type === classData.type)
            const defaultCost = setting?.credit_cost ?? DEFAULT_CREDIT_COSTS[classData.type] ?? 1
            setCreditCostInput(String(defaultCost))
        }
    }, [open, classData.id])

    async function fetchStudents() {
        setLoadingStudents(true)
        try {
            const data = await getClassStudents(classData.id)
            setStudents(data as unknown as Student[])
        } catch {
            toast.error('수강생 목록을 불러오지 못했습니다.')
        } finally {
            setLoadingStudents(false)
        }
    }

    // --- Media Link ---
    async function handleSaveMediaLink() {
        startTransition(async () => {
            const result = await updateClassMediaLink(classData.id, mediaLink)
            if (result.success) {
                setMediaLinkSaved(true)
                toast.success('미디어 링크가 저장되었습니다.')
                setTimeout(() => setMediaLinkSaved(false), 2000)
            } else {
                toast.error(result.error || '저장 실패')
            }
        })
    }

    // --- Class Completion ---
    async function handleToggleCompletion() {
        startTransition(async () => {
            const newValue = !isCompleted
            const result = await updateClassCompletion(classData.id, newValue)
            if (result.success) {
                setIsCompleted(newValue)
                toast.success(newValue ? '수업이 완료 처리되었습니다.' : '수업 완료가 취소되었습니다.')
                onRefresh?.()
            } else {
                toast.error(result.error || '상태 변경 실패')
            }
        })
    }

    // --- Search Users ---
    async function handleSearch() {
        if (!searchQuery.trim()) return
        setIsSearching(true)
        try {
            const results = await searchUsers(searchQuery.trim())
            setSearchResults(results as SearchResult[])
        } catch {
            toast.error('검색 중 오류가 발생했습니다.')
        } finally {
            setIsSearching(false)
        }
    }

    // --- Add Student ---
    async function handleAddStudent() {
        if (!selectedUser) return

        const cost = parseInt(creditCostInput) || 0

        startTransition(async () => {
            const result = await addStudentToClass(classData.id, selectedUser.id, cost)
            if (result.success) {
                toast.success(`${selectedUser.name || selectedUser.email} 수강생이 추가되었습니다.`)
                setShowAddStudent(false)
                setSelectedUser(null)
                setSearchQuery('')
                setSearchResults([])
                fetchStudents()
                onRefresh?.()
            } else {
                toast.error(result.error || '추가 실패')
            }
        })
    }

    // --- Remove Student ---
    async function handleRemoveStudent(student: Student) {
        const refundAmount = student.credit_cost || 0
        const studentName = student.profiles?.name || student.profiles?.email || '수강생'

        const confirmed = await confirm({
            title: `${studentName} 수강 삭제`,
            description: refundAmount > 0
                ? `이 수강생을 삭제하시겠습니까?\n\n차감된 크레딧: ${refundAmount}${CREDIT_UNIT}\n환불 여부는 다음 단계에서 선택합니다.`
                : '이 수강생을 삭제하시겠습니까?',
            confirmText: '삭제 진행',
            variant: 'destructive',
        })

        if (!confirmed) return

        // Ask refund preference if credit was charged
        let shouldRefund = false
        if (refundAmount > 0 && !student.credit_refunded) {
            shouldRefund = await confirm({
                title: '크레딧 환불',
                description: `${refundAmount}${CREDIT_UNIT}를 환불하시겠습니까?`,
                confirmText: `${refundAmount}${CREDIT_UNIT} 환불`,
                cancelText: '환불 없이 삭제',
            })
        }

        startTransition(async () => {
            const result = await removeStudentFromClass(student.id, shouldRefund)
            if (result.success) {
                const refundMsg = shouldRefund ? ` (${refundAmount}${CREDIT_UNIT} 환불됨)` : ''
                toast.success(`${studentName} 삭제 완료${refundMsg}`)
                fetchStudents()
                onRefresh?.()
            } else {
                toast.error(result.error || '삭제 실패')
            }
        })
    }

    // --- Complete Attendance ---
    async function handleCompleteAttendance(student: Student) {
        if (student.status === 'attended') {
            toast.info('이미 출석 완료된 수강생입니다.')
            return
        }

        const studentName = student.profiles?.name || student.profiles?.email || '수강생'

        startTransition(async () => {
            const result = await completeReservation(student.id)
            if (result.success) {
                toast.success(`${studentName} 출석 완료`)
                fetchStudents()
                onRefresh?.()
            } else {
                toast.error(result.error || '출석 처리 실패')
            }
        })
    }

    // --- Cancel Attendance ---
    async function handleCancelAttendance(student: Student) {
        if (student.status !== 'attended') {
            toast.info('출석 완료 처리된 수강생이 아닙니다.')
            return
        }

        const studentName = student.profiles?.name || student.profiles?.email || '수강생'

        const ok = await confirm({
            title: '출석 완료 취소',
            description: `${studentName}님의 출석 완료 처리를 취소하시겠습니까?`,
            confirmText: '취소하기',
            cancelText: '닫기'
        })
        if (!ok) return

        startTransition(async () => {
            const result = await cancelReservationCompletion(student.id)
            if (result.success) {
                toast.success(`${studentName} 출석 취소됨`)
                fetchStudents()
                onRefresh?.()
            } else {
                toast.error(result.error || '출석 취소 실패')
            }
        })
    }

    const typeName = CLASS_TYPES[classData.type as keyof typeof CLASS_TYPES] || classData.type

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between mt-4">
                        <DialogTitle className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                                {typeName}
                            </Badge>
                            <span>
                                {classData.title || typeName} - {classData.date} {classData.time?.slice(0, 5)}
                            </span>
                        </DialogTitle>
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                            <input
                                type="checkbox"
                                id="class-completed"
                                checked={isCompleted}
                                onChange={handleToggleCompletion}
                                disabled={isPending}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                            />
                            <Label htmlFor="class-completed" className="text-sm font-semibold cursor-pointer">
                                수업 완료
                            </Label>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 py-2">
                    {/* 1. Media Link Section */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <LinkIcon className="w-3.5 h-3.5" />
                            미디어 링크 (Google Drive 등)
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="https://drive.google.com/..."
                                value={mediaLink}
                                onChange={(e) => {
                                    setMediaLink(e.target.value)
                                    setMediaLinkSaved(false)
                                }}
                                className="flex-1"
                            />
                            <Button
                                size="sm"
                                variant={mediaLinkSaved ? 'outline' : 'default'}
                                onClick={handleSaveMediaLink}
                                disabled={isPending}
                                className="shrink-0"
                            >
                                {isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : mediaLinkSaved ? (
                                    <><Check className="w-4 h-4 mr-1" /> 저장됨</>
                                ) : (
                                    <><Save className="w-4 h-4 mr-1" /> 저장</>
                                )}
                            </Button>
                        </div>
                        {mediaLink && (
                            <a
                                href={mediaLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                                <LinkIcon className="w-3 h-3" /> 링크 열기
                            </a>
                        )}
                    </div>

                    {/* 2. Student Roster */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                수강생 명단 ({students.length}/{classData.max_capacity || '?'})
                            </Label>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowAddStudent(!showAddStudent)}
                                className="h-7 text-xs"
                            >
                                <UserPlus className="w-3.5 h-3.5 mr-1" />
                                수강생 추가
                            </Button>
                        </div>

                        {/* Add Student Form */}
                        {showAddStudent && (
                            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-blue-700">수강생 추가</span>
                                    <button
                                        onClick={() => {
                                            setShowAddStudent(false)
                                            setSelectedUser(null)
                                            setSearchQuery('')
                                            setSearchResults([])
                                        }}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Search */}
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="이름 또는 이메일로 검색"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        className="flex-1 h-8 text-sm bg-white"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleSearch}
                                        disabled={isSearching}
                                        className="h-8"
                                    >
                                        {isSearching ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Search className="w-3.5 h-3.5" />
                                        )}
                                    </Button>
                                </div>

                                {/* Search Results */}
                                {searchResults.length > 0 && !selectedUser && (
                                    <div className="bg-white border rounded-lg divide-y max-h-40 overflow-y-auto">
                                        {searchResults.map((user) => (
                                            <button
                                                key={user.id}
                                                onClick={() => setSelectedUser(user)}
                                                className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors flex justify-between items-center"
                                            >
                                                <div>
                                                    <span className="text-sm font-medium">{user.name || '이름 없음'}</span>
                                                    <span className="text-xs text-slate-400 ml-2">{user.email}</span>
                                                </div>
                                                <span className="text-xs text-blue-600 font-bold">{user.general_credits}{CREDIT_UNIT}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Selected User + Credit Cost */}
                                {selectedUser && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between bg-white border rounded-lg px-3 py-2">
                                            <div>
                                                <span className="text-sm font-bold">{selectedUser.name || '이름 없음'}</span>
                                                <span className="text-xs text-slate-400 ml-2">{selectedUser.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-blue-600">보유 {selectedUser.general_credits}{CREDIT_UNIT}</span>
                                                <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Label className="text-xs font-medium text-slate-600 shrink-0">차감 크레딧</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={creditCostInput}
                                                onChange={(e) => setCreditCostInput(e.target.value)}
                                                className="w-24 h-8 text-sm text-center bg-white"
                                            />
                                            <span className="text-xs text-slate-400">{CREDIT_UNIT}</span>
                                        </div>

                                        {parseInt(creditCostInput) > selectedUser.general_credits && (
                                            <p className="text-xs text-red-500">
                                                보유 크레딧({selectedUser.general_credits}{CREDIT_UNIT})보다 차감액이 큽니다.
                                            </p>
                                        )}

                                        <Button
                                            size="sm"
                                            className="w-full"
                                            onClick={handleAddStudent}
                                            disabled={isPending}
                                        >
                                            {isPending ? (
                                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                            ) : (
                                                <UserPlus className="w-4 h-4 mr-1" />
                                            )}
                                            {parseInt(creditCostInput) > 0
                                                ? `추가 (${creditCostInput}${CREDIT_UNIT} 차감)`
                                                : '추가 (무료)'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Student List */}
                        {loadingStudents ? (
                            <div className="flex justify-center py-6">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                            </div>
                        ) : students.length > 0 ? (
                            <div className="space-y-2">
                                {students.map((student, idx) => (
                                    <div
                                        key={student.id}
                                        className="p-3 bg-white border border-slate-100 rounded-xl space-y-2"
                                    >
                                        {/* Student Row */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-300 w-5">{idx + 1}</span>
                                                <div>
                                                    <span className="text-sm font-medium text-slate-800">
                                                        {student.profiles?.name || '이름 없음'}
                                                    </span>
                                                    <span className="text-xs text-slate-400 ml-2">
                                                        {student.profiles?.email}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                {student.credit_cost > 0 && (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        {student.credit_cost}{CREDIT_UNIT}
                                                    </Badge>
                                                )}
                                                {student.status === 'attended' ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 px-2 text-xs text-green-600 hover:text-green-800 hover:bg-green-50"
                                                        onClick={() => handleCancelAttendance(student)}
                                                        disabled={isPending}
                                                    >
                                                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                                        출석 완료
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200"
                                                        onClick={() => handleCompleteAttendance(student)}
                                                        disabled={isPending}
                                                    >
                                                        <Check className="w-3.5 h-3.5 mr-1" />
                                                        출석 처리
                                                    </Button>
                                                )}
                                                {student.status === 'attended' || isCompleted ? (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                        asChild
                                                    >
                                                        <Link href={`/admin/debriefings?class_id=${classData.id}`}>
                                                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                                            디브리핑 작성
                                                        </Link>
                                                    </Button>
                                                ) : null}
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleRemoveStudent(student)}
                                                    disabled={isPending}
                                                >
                                                    <UserMinus className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                등록된 수강생이 없습니다.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
